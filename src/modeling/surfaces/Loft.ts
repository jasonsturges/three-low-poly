import { BufferGeometry, ShapeUtils, Vector2, Vector3 } from "three";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type GeometryBuffers,
  type Vec3,
} from "../mesh/GeometryBuffers";

export interface LoftOptions {
  /** Triangulate each end after projection onto its Newell-normal plane. */
  cap?: boolean;
  /** Stitch the final ring to the first and omit caps; do not repeat the first ring. */
  closed?: boolean;
}

/** Newell’s area-weighted normal accumulated from every ring edge; degenerate rings return zero. */
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

/** Project a ring onto its Newell-normal plane, triangulate it, and orient the cap toward outward. */
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

  // Fan fallback can cross a concave outline; callers must validate the resulting cap.
  for (let i = 1; i < ring.length - 1; i++) {
    const [i1, i2] = flip ? [i + 1, i] : [i, i + 1];
    pushTriangle(buffers, [at(ring[0]!), at(ring[i1]!), at(ring[i2]!)], undefined);
  }
}

/**
 * Skin closed rings with equal point counts and corresponding indices; inputs remain unchanged.
 * Fewer than two rings returns empty geometry; unequal point counts throw.
 *
 * ```ts
 * // Transition from a square section to a circle.
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
      // Quad normals come from the first three corners; warped bands remain faceted.
      pushQuad(buffers, [at(lower[j]!), at(lower[i]!), at(upper[i]!), at(upper[j]!)], undefined);
    }
  }

  // Neighboring ring centroids determine outward cap orientation.
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
