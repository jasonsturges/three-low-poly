import { BufferGeometry, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { linePath } from "../../paths/LinePath";
import { openingOutline, type WallOpeningOptions } from "../../shapes/WallShape";
import { miterFrames } from "../../sweep/MiterFrames";
import { circleProfile } from "../../sweep/Profiles";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec2,
  type Vec3,
} from "../../utils/GeometryBuffers";

export interface DiamondLatticeGeometryOptions {
  /**
   * The opening the lattice fills. The SAME description a wall is punched with and a
   * {@link WindowFrameGeometry} is built from, so the three agree by construction.
   *
   * **There is no separate rectangular case.** `arch: "square"` is a flat head — an arch-shaped hole with
   * no curve in it — so a mullioned rectangle and a gothic light are one geometry with different points.
   */
  opening?: WallOpeningOptions;
  /**
   * Half the angle between the two came families, in degrees. Defaults to `45`, which is the square
   * diamond everyone pictures.
   *
   * Lower leans the quarries tall, higher leans them wide. The families are symmetric: `+angle` and
   * `−angle`.
   */
  angle?: number;
  /**
   * Perpendicular distance between neighbouring cames. Defaults to `0.19`.
   *
   * Measured across the cames rather than along an axis, so it means the same thing at any `angle` —
   * spacing measured on an axis would compress as the lattice leans.
   */
  spacing?: number;
  /**
   * Slides the whole grid across the opening, in world units. Defaults to `0`.
   *
   * The difference between a quarry centred on the crown and a came running up it. Nothing else moves the
   * pattern relative to the opening, and it is what decides which cames clip a corner and get dropped.
   */
  phase?: number;
  /** Thickness of the came, across and through. Defaults to `0.022`. */
  cameWidth?: number;
  /** Sides on the came's section — the low-poly knob. `4` is square lead, `12` reads round. Defaults to `4`. */
  cameSides?: number;
  /**
   * How finely the arch is followed. Defaults to `20`.
   *
   * This is also the ceiling on the came ENDS: they are cut against the outline's segments, so a came can
   * never be finer than the boundary it dies into — and is never rougher.
   */
  curveSegments?: number;
}

/** A came's end, and the ring point it came from. */
interface Span {
  ring: Vector3;
  back: Vector3;
  front: Vector3;
}

/**
 * Diamond lattice leading — the cames of a leaded light, cut into the opening at both ends.
 *
 * Every came SPANS the opening, and both of its ends are cut by the boundary itself rather than stopping
 * square. That is the whole point: a square-ended bar leaves teeth poking out through the frame, which is
 * what has always made an arched lattice hard. Here each ring point of the came runs along its own axis to
 * whichever segment of the outline it meets, with the ring split wherever that choice changes, so the ends
 * follow the arch exactly as closely as the arch itself is cut.
 *
 * **Not "arched" in the name, deliberately.** `arch: "square"` is a flat head, so a rectangular light and
 * a gothic one are the same geometry with different points — exactly as {@link WindowFrameGeometry} rings
 * any arch without saying so in its name. Two names would rebuild the split this construction removes.
 *
 * Cames CROSS one another and are left to interpenetrate, which is correct rather than lazy: lead came
 * crosses lead came, and an X-junction has no bisector to share.
 *
 * Baked to a single `BufferGeometry` — one draw call for the whole leading.
 *
 * Drawn at the ORIGIN — centred on X, sill at `y = 0` — whatever the opening's own `x` and `y` say, so
 * one lattice can be positioned into many openings and so it lands on a `WindowFrameGeometry` built from
 * the same description. Material groups: none; pass one material, not an array.
 *
 * A leaded light is the obvious use, but nothing here knows that. The same thing is a garden trellis, a
 * gate infill, or a screen.
 *
 * @example
 * ```ts
 * const opening = { width: 1.24, height: 1.15, arch: "pointed", archHeight: 0.78 } as const;
 *
 * const lattice = new Mesh(new DiamondLatticeGeometry({ opening }), lead);
 * const frame = new Mesh(new WindowFrameGeometry({ opening }), iron);
 * ```
 */
export class DiamondLatticeGeometry extends BufferGeometry {
  /** How many cames were built. Short offcuts that clip a corner are dropped, so this is not derivable. */
  readonly cameCount: number;

  constructor({
    opening = {},
    angle = 45,
    spacing = 0.19,
    phase = 0,
    cameWidth = 0.022,
    cameSides = 4,
    curveSegments = 20,
  }: DiamondLatticeGeometryOptions = {}) {
    super();

    // At the origin: the lattice does not care where its opening sits in a wall, only what shape it is.
    const boundary = openingOutline({ ...opening, x: 0, y: 0 })
      .getPoints(Math.max(2, Math.round(curveSegments)))
      .map((p) => new Vector2(p.x, p.y));
    // `getPoints` closes the loop by repeating the start; a repeated point is a zero-length edge.
    if (
      boundary.length > 1 &&
      boundary[0]!.distanceToSquared(boundary[boundary.length - 1]!) < 1e-12
    ) {
      boundary.pop();
    }

    const profile = circleProfile(cameWidth / 2, Math.max(3, Math.round(cameSides)));
    const parts = [
      ...cameFamily(angle, boundary, profile, spacing, phase, cameWidth),
      ...cameFamily(-angle, boundary, profile, spacing, phase, cameWidth),
    ];
    this.cameCount = parts.length;

    if (parts.length === 0) {
      this.computeBoundingSphere();
      return;
    }

    // Not cast — `mergeGeometries` returns null on mismatched attributes, and a cast turns that into an
    // unreadable "cannot read properties of null" three frames later.
    const merged = mergeGeometries(parts, false);
    if (!merged) throw new Error("DiamondLatticeGeometry: came parts have incompatible attributes.");

    this.copy(merged);
    merged.dispose();
    parts.forEach((part) => part.dispose());
    this.computeBoundingSphere();
  }
}

const cross2 = (a: Vector2, b: Vector2) => a.x * b.y - a.y * b.x;

/** Where a ray from `p` along `d` first meets the boundary. `owner: -1` when it misses entirely. */
function castToBoundary(p: Vector2, d: Vector2, boundary: Vector2[]): { t: number; owner: number } {
  let best = Infinity;
  let owner = -1;
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]!;
    const b = boundary[(i + 1) % boundary.length]!;
    const edge = b.clone().sub(a);
    const denominator = cross2(d, edge);
    if (Math.abs(denominator) < 1e-12) continue;
    const w = a.clone().sub(p);
    const t = cross2(w, edge) / denominator;
    const u = cross2(w, d) / denominator;
    // The SEGMENT, not its infinite line. Taking the nearest LINE would cut against edges that are not
    // there, which is what makes a concave head — an ogee — come out wrong.
    if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) {
      best = t;
      owner = i;
    }
  }
  return { t: best, owner };
}

/**
 * Every stretch of the infinite line through `p` along `d` that lies INSIDE the boundary.
 *
 * A came laid across an ogee or a horseshoe enters and leaves more than once, so the crossings are
 * collected, sorted, and taken in pairs — between the first and second you are inside, between the second
 * and third you are out. Half-open on `u` so a crossing exactly on a shared vertex counts once; counted
 * twice, the pairing swaps inside for outside along the rest of the line.
 */
function lineChords(p: Vector2, d: Vector2, boundary: Vector2[]): [number, number][] {
  const hits: number[] = [];
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]!;
    const b = boundary[(i + 1) % boundary.length]!;
    const edge = b.clone().sub(a);
    const denominator = cross2(d, edge);
    if (Math.abs(denominator) < 1e-12) continue;
    const w = a.clone().sub(p);
    const u = cross2(w, d) / denominator;
    if (u >= 0 && u < 1) hits.push(cross2(w, edge) / denominator);
  }
  hits.sort((a, b) => a - b);

  const chords: [number, number][] = [];
  for (let i = 0; i + 1 < hits.length; i += 2) chords.push([hits[i]!, hits[i + 1]!]);
  return chords;
}

/** Even-odd ray cast. A came that starts outside gets a perfect cut to a meaningless question. */
function insideBoundary(p: Vector2, boundary: Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const a = boundary[i]!;
    const b = boundary[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Where along a ring edge the winning boundary segment changes, for one direction.
 *
 * The ray through `lerp(a, b, s)` passes through a boundary vertex when `(vertex − p(s)) × d = 0`, and
 * `p(s)` is linear in `s`, so each root is one division rather than a search. A wide came crosses several
 * vertices at once, so every one between the two owners contributes a split.
 */
function splitParams(a: Vector3, b: Vector3, d: Vector2, boundary: Vector2[]): number[] {
  const here = castToBoundary(new Vector2(a.x, a.y), d, boundary);
  const next = castToBoundary(new Vector2(b.x, b.y), d, boundary);
  if (here.owner < 0 || next.owner < 0 || here.owner === next.owner) return [];

  // Segment indices are CYCLIC — the sill is `0` and the last jamb is the final index, and they share the
  // opening's bottom corner. Comparing them as plain numbers sends the walk the long way over the crown.
  const count = boundary.length;
  const ahead = (next.owner - here.owner + count) % count;
  const behind = (here.owner - next.owner + count) % count;
  const step = ahead <= behind ? 1 : -1;
  const steps = Math.min(ahead, behind);

  const out: number[] = [];
  let k = here.owner;
  for (let i = 0; i < steps; i++) {
    const vertex = boundary[step > 0 ? (k + 1) % count : k]!;
    const gi = cross2(vertex.clone().sub(new Vector2(a.x, a.y)), d);
    const gj = cross2(vertex.clone().sub(new Vector2(b.x, b.y)), d);
    const s = gi / (gi - gj);
    if (Number.isFinite(s) && s > 1e-9 && s < 1 - 1e-9) out.push(s);
    k = (k + step + count) % count;
  }
  return out;
}

/**
 * Both ends cut to the boundary, on ONE ring.
 *
 * The two ends cross different segments, so each wants its own splits — and a side band built on a ring
 * carrying only one set tears where the other falls. So the splits are unioned before the ring is
 * subdivided. A split the far end did not ask for costs a degenerate seam, never a hole.
 */
function spanOpening(ring: Vector3[], axis: Vector3, boundary: Vector2[]): Span[] {
  const forward = new Vector2(axis.x, axis.y).normalize();
  const backward = forward.clone().negate();

  const points: Vector3[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    points.push(a.clone());
    const cuts = [...splitParams(a, b, forward, boundary), ...splitParams(a, b, backward, boundary)]
      .sort((p, q) => p - q)
      .filter((s, index, all) => index === 0 || s - all[index - 1]! > 1e-9);
    for (const s of cuts) points.push(a.clone().lerp(b, s));
  }

  const spans: Span[] = [];
  for (const p of points) {
    const flat = new Vector2(p.x, p.y);
    const ahead = castToBoundary(flat, forward, boundary);
    const behind = castToBoundary(flat, backward, boundary);
    // A point that escapes in either direction has no came at all. Refusing beats silently dropping a
    // vertex out of a closed loop, which would open the solid.
    if (ahead.owner < 0 || behind.owner < 0) return [];
    spans.push({
      ring: p,
      front: p.clone().addScaledVector(axis, ahead.t),
      back: p.clone().addScaledVector(axis, -behind.t),
    });
  }
  return spans;
}

/**
 * A came's end cap, triangulated so no triangle spans two facets.
 *
 * The cast reads only a point's LATERAL offset, so facet boundaries are lines of constant lateral offset,
 * and the cap — which projects exactly onto the ring, every point travelling along the same axis — is a
 * polygon monotone in that coordinate with a vertex on both chains at every cut. Walking the two chains in
 * lateral order therefore never reaches past a cut. Fanning each facet instead leaves a hole the moment
 * there are more than two crossings.
 */
function capEnd(
  buffers: ReturnType<typeof createGeometryBuffers>,
  spans: Span[],
  pick: (s: Span) => Vector3,
  axis: Vector3,
  flip: boolean,
): void {
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  const count = spans.length;
  const center = spans.reduce((sum, s) => sum.add(s.ring), new Vector3()).divideScalar(count);
  const lateral = new Vector3(-axis.y, axis.x, 0).normalize();
  const u = spans.map((s) => s.ring.clone().sub(center).dot(lateral));

  let low = 0;
  let high = 0;
  for (let i = 1; i < count; i++) {
    if (u[i]! < u[low]!) low = i;
    if (u[i]! > u[high]!) high = i;
  }
  const chain = (step: number) => {
    const out = [low];
    for (let i = (low + step + count) % count; i !== high; i = (i + step + count) % count) out.push(i);
    out.push(high);
    return out;
  };
  const forward = chain(1);
  const backward = chain(-1);

  const emit = (a: number, b: number, c: number) => {
    const tri: [Vec3, Vec3, Vec3] = [at(pick(spans[a]!)), at(pick(spans[b]!)), at(pick(spans[c]!))];
    pushTriangle(buffers, flip ? [tri[0], tri[2], tri[1]] : tri, undefined);
  };

  let a = 0;
  let b = 0;
  while (a < forward.length - 1 || b < backward.length - 1) {
    const advance =
      b >= backward.length - 1 || (a < forward.length - 1 && u[forward[a + 1]!]! <= u[backward[b + 1]!]!);
    if (advance) {
      emit(forward[a]!, backward[b]!, forward[a + 1]!);
      a++;
    } else {
      emit(forward[a]!, backward[b]!, backward[b + 1]!);
      b++;
    }
  }
}

/** One came: sides between its two cut ends, and a cap on each. */
function buildCame(spans: Span[], axis: Vector3): BufferGeometry | null {
  if (spans.length < 3) return null;

  const buffers = createGeometryBuffers();
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  for (let i = 0; i < spans.length; i++) {
    const j = (i + 1) % spans.length;
    pushQuad(
      buffers,
      [at(spans[j]!.back), at(spans[i]!.back), at(spans[i]!.front), at(spans[j]!.front)],
      undefined,
    );
  }
  capEnd(buffers, spans, (s) => s.front, axis, false);
  capEnd(buffers, spans, (s) => s.back, axis, true);
  return toBufferGeometry(buffers);
}

/**
 * One family of parallel cames.
 *
 * Lines are laid out by their PERPENDICULAR offset, which is what makes `spacing` mean the same thing at
 * any angle. Short offcuts are dropped: a chord barely longer than the stock is a scrap of lead no glazier
 * would cut, and its ring would straddle the boundary anyway.
 */
function cameFamily(
  angleDegrees: number,
  boundary: Vector2[],
  profile: Vec2[],
  spacing: number,
  phase: number,
  cameWidth: number,
): BufferGeometry[] {
  const angle = (angleDegrees * Math.PI) / 180;
  const axis = new Vector3(Math.cos(angle), Math.sin(angle), 0);
  const normal = new Vector2(-Math.sin(angle), Math.cos(angle));
  const flat = new Vector2(axis.x, axis.y);

  const offsets = boundary.map((p) => p.dot(normal));
  const step = Math.max(spacing, 1e-4);
  const from = Math.ceil((Math.min(...offsets) - phase) / step);
  const to = Math.floor((Math.max(...offsets) - phase) / step);

  const parts: BufferGeometry[] = [];
  for (let k = from; k <= to; k++) {
    const seed = normal.clone().multiplyScalar(k * step + phase);
    for (const [near, far] of lineChords(seed, flat, boundary)) {
      if (far - near < cameWidth * 3) continue;

      const center = new Vector3(seed.x, seed.y, 0).addScaledVector(axis, (near + far) / 2);
      const station = miterFrames(linePath(center, center.clone().add(axis), 1), {
        reference: new Vector3(0, 0, 1),
      })[0]!;
      const ring = profile.map(([px, py]) =>
        station.position.clone().addScaledVector(station.normal, px).addScaledVector(station.binormal, py),
      );
      if (ring.some((p) => !insideBoundary(new Vector2(p.x, p.y), boundary))) continue;

      const came = buildCame(spanOpening(ring, axis, boundary), axis);
      if (came) parts.push(came);
    }
  }
  return parts;
}
