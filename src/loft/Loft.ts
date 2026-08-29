import { BufferGeometry, ShapeUtils, Vector2, Vector3 } from "three";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type GeometryBuffers,
  type Vec3,
} from "../utils/GeometryBuffers";

export interface LoftOptions {
  /**
   * Cap the two ends. Defaults to `true`.
   *
   * Ear-clipped against the ring's own best-fit plane, so a concave section caps correctly. Turn it off
   * for a run that dies into a wall, or for a skin whose ends are closed by something else.
   */
  cap?: boolean;
  /**
   * Close the sequence — skin the last ring back to the first, and emit no caps.
   *
   * A closed sequence has no ends, so capping it would put a disc inside it. Do not repeat the first ring
   * at the end: the wrap is what closes it. This is the section-sequence closing on itself, which is a
   * different thing from any individual ring being closed — every ring is always closed.
   */
  closed?: boolean;
}

/**
 * Newell's normal for a ring — the best-fit plane's direction, from every edge rather than from three
 * chosen points.
 *
 * Three points would do for a triangle and are a coin flip for anything else: pick three that happen to
 * be nearly colinear and the normal is noise. A lofted ring is routinely non-planar and frequently has
 * colinear runs, so the robust construction is the one to use.
 */
function ringNormal(ring: Vector3[]): Vector3 {
  const normal = new Vector3();

  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    normal.x += (a.y - b.y) * (a.z + b.z);
    normal.y += (a.z - b.z) * (a.x + b.x);
    normal.z += (a.x - b.x) * (a.y + b.y);
  }

  return normal.normalize();
}

/**
 * Cap one end, facing away from `outward`.
 *
 * Ear-clipped, not fanned. A fan tiles a section only when it is star-shaped from its own first corner,
 * which every convex section is and several real ones are not — the same trap `sweep` documents on its
 * own caps. Projecting to the ring's best-fit plane first is what lets `ShapeUtils` do the work on a ring
 * that is sitting in an arbitrary plane in space.
 */
function capRing(buffers: GeometryBuffers, ring: Vector3[], outward: Vector3): void {
  if (ring.length < 3) return;

  const normal = ringNormal(ring);
  if (normal.lengthSq() < 0.5) return; // Degenerate ring — no plane, nothing to cap.

  // Any axis not parallel to the normal will seed the basis; the smallest component is the safest pick.
  const seed =
    Math.abs(normal.x) <= Math.abs(normal.y) && Math.abs(normal.x) <= Math.abs(normal.z)
      ? new Vector3(1, 0, 0)
      : Math.abs(normal.y) <= Math.abs(normal.z)
        ? new Vector3(0, 1, 0)
        : new Vector3(0, 0, 1);

  const u = new Vector3().crossVectors(normal, seed).normalize();
  const v = new Vector3().crossVectors(normal, u);
  const origin = ring[0]!;

  const contour = ring.map((p) => {
    const d = new Vector3().subVectors(p, origin);
    return new Vector2(d.dot(u), d.dot(v));
  });

  const faces = ShapeUtils.triangulateShape(contour, []);

  // `triangulateShape` hands back counter-clockwise triangles in the (u, v) frame, whose normal is `+n`.
  // Flip them wholesale when that faces the wrong way, so the cap agrees with the skin around it.
  const flip = normal.dot(outward) < 0;
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];

  if (faces.length > 0) {
    for (const [a, b, c] of faces) {
      const [i0, i1, i2] = flip ? [a!, c!, b!] : [a!, b!, c!];
      pushTriangle(buffers, [at(ring[i0]!), at(ring[i1]!), at(ring[i2]!)], undefined);
    }
    return;
  }

  // Ear clipping gives up on a degenerate outline. A fan is wrong for a concave one, but a missing cap is
  // a hole — so fall back rather than leave the end open.
  for (let i = 1; i < ring.length - 1; i++) {
    const [i1, i2] = flip ? [i + 1, i] : [i, i + 1];
    pushTriangle(buffers, [at(ring[0]!), at(ring[i1]!), at(ring[i2]!)], undefined);
  }
}

/**
 * Skin a sequence of cross-sections — the second surface primitive, and the sibling of {@link sweep}.
 *
 * A SWEEP carries one profile along a path: the section never changes shape, and the path generates the
 * frames. A LOFT skins a sequence of rings that need not match, and there is no path at all — the
 * sections themselves say where the surface goes. So a sweep is a special CASE of a loft, and `sweep`
 * contains one: its ring-stitching loop is this function, with the frames-and-profile half generating the
 * sections first. What a loft can do that no sweep can is change the section — a square into a circle.
 *
 * The name is literal. Lofting is shipbuilding: full-size cross-sections chalked on the floor of a mould
 * LOFT, with a fair surface passed through them. `Station` is the same word from the same trade.
 *
 * **Every ring must already correspond** — same length, and aligned so that index `i` in one ring pairs
 * with index `i` in the next. That is not this function's job and deliberately so: correspondence is
 * where every judgment call lives, exactly as framing is for a sweep, and it is worth choosing
 * explicitly. {@link correspondLoops} and {@link alignRings} are the tools for it. Rings of differing
 * length throw rather than silently skinning garbage, because there is no correct thing to assume.
 *
 * @example
 * ```ts
 * // A square carried into a circle — the thing a sweep provably cannot do.
 * const loops = correspondLoops([squareOutline, circleOutline]);
 * const rings = loops.map((loop, i) => loop.map((p) => new Vector3(p.x, i * 2, p.y)));
 * const geometry = loft(alignRings(rings));
 * ```
 */
export function loft(rings: Vector3[][], { cap = true, closed = false }: LoftOptions = {}): BufferGeometry {
  const buffers = createGeometryBuffers();
  if (rings.length < 2) return toBufferGeometry(buffers);

  const width = rings[0]!.length;
  for (let s = 1; s < rings.length; s++) {
    if (rings[s]!.length !== width) {
      throw new Error(
        `loft() requires corresponding rings: ring 0 has ${width} points, ring ${s} has ${rings[s]!.length}. ` +
          `Reconcile them with correspondLoops() before lofting.`,
      );
    }
  }

  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  const bands = closed ? rings.length : rings.length - 1;

  for (let s = 0; s < bands; s++) {
    const lower = rings[s]!;
    const upper = rings[(s + 1) % rings.length]!;

    for (let i = 0; i < width; i++) {
      const j = (i + 1) % width;
      // The normal is derived from the winding rather than supplied: a lofted band between two
      // differently-shaped sections is generally not planar, and no caller knows its normal in advance.
      pushQuad(buffers, [at(lower[j]!), at(lower[i]!), at(upper[i]!), at(upper[j]!)], undefined);
    }
  }

  // Each cap faces AWAY from the ring next to it, which is the only direction available that comes from
  // the loft itself rather than from a convention the caller has to remember.
  if (cap && !closed) {
    const first = rings[0]!;
    const second = rings[1]!;
    const last = rings[rings.length - 1]!;
    const penultimate = rings[rings.length - 2]!;

    const centroid = (ring: Vector3[]) =>
      ring.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(ring.length);

    capRing(buffers, first, new Vector3().subVectors(centroid(first), centroid(second)));
    capRing(buffers, last, new Vector3().subVectors(centroid(last), centroid(penultimate)));
  }

  return toBufferGeometry(buffers);
}
