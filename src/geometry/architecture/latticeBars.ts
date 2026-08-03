import { BufferGeometry, Vector2, Vector3 } from "three";
import { linePath } from "../../paths/LinePath";
import { openingOutline, type WallOpeningOptions } from "../../shapes/WallShape";
import { miterFrames } from "../../sweep/MiterFrames";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec2,
  type Vec3,
} from "../../utils/GeometryBuffers";

/**
 * Bars spanning an opening, each cut into its boundary at BOTH ends.
 *
 * Shared by every lattice, because the lattice type is only ever a choice of angles: a diamond is two
 * families at `±45°`, a Gregorian is `90°` and `0°`. Nothing here knows which it is building.
 *
 * The construction is a LOFT, not a sweep. Every point of a bar's ring runs along its own axis to
 * whichever segment of the boundary it meets, and the ring is split wherever that choice changes — so the
 * ends follow an arch exactly as closely as the arch itself is cut, and a square head degenerates to a
 * plain square cut with no special case. That is what stops a bar poking a tooth out through the frame.
 *
 * Bars CROSS one another and are left to interpenetrate, which is correct rather than lazy: lead came
 * crosses lead came and mullion crosses transom, and an X-junction has no bisector to share.
 */

/** How close to a shared vertex a crossing counts as being ON it. See {@link lineChords}. */
const VERTEX_EPSILON = 1e-9;

const cross2 = (a: Vector2, b: Vector2) => a.x * b.y - a.y * b.x;

/** One family of parallel bars. */
export interface BarFamily {
  /** Direction, in degrees from horizontal. `90` is upright, `0` is level, `45` is a diamond's leg. */
  angle: number;
  /** Perpendicular distance between neighbors — the same at any angle, unlike spacing along an axis. */
  spacing: number;
  /** Slides the family across the opening. Defaults to `0`. */
  phase?: number;
}

/** The opening's outline as a closed polyline, normalized to the origin and de-duplicated. */
export function openingBoundary(opening: WallOpeningOptions, curveSegments: number): Vector2[] {
  const points = openingOutline({ ...opening, x: 0, y: 0 })
    .getPoints(Math.max(2, Math.round(curveSegments)))
    .map((p) => new Vector2(p.x, p.y));
  // `getPoints` closes the loop by repeating the start, and a repeated point is a zero-length edge.
  if (points.length > 1 && points[0]!.distanceToSquared(points[points.length - 1]!) < 1e-12) {
    points.pop();
  }
  return points;
}

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
 * A bar laid across an ogee or a horseshoe enters and leaves more than once, so the crossings are
 * collected, sorted, and taken in pairs — between the first and second you are inside, between the second
 * and third you are out.
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
    // Half-open on `u`, so a crossing landing exactly on a shared VERTEX is counted once rather than
    // twice — that would be `u = 1` on the arriving edge and `u = 0` on the leaving one.
    //
    // The tolerance is not decoration. Exact `u < 1` fails to exclude a `u` that rounds to
    // `0.999999999...`, the vertex is counted twice, the crossing count goes ODD, and the inside/outside
    // pairing shifts for the rest of the line — turning the real chord into a zero-length one and losing
    // the bar. It fires only when a line passes exactly through a corner, and then on one side and not
    // the other, purely by how the arithmetic rounded.
    if (u >= -VERTEX_EPSILON && u < 1 - VERTEX_EPSILON) hits.push(cross2(w, edge) / denominator);
  }
  hits.sort((a, b) => a - b);

  const chords: [number, number][] = [];
  for (let i = 0; i + 1 < hits.length; i += 2) chords.push([hits[i]!, hits[i + 1]!]);
  return chords;
}

/** Even-odd ray cast. A bar that starts outside gets a perfect cut to a meaningless question. */
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
 * `p(s)` is linear in `s`, so each root is one division. A wide bar crosses several vertices at once, so
 * every one between the two owners contributes a split.
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

interface Span {
  ring: Vector3;
  back: Vector3;
  front: Vector3;
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
    // A point that escapes in either direction has no bar at all. Refusing beats silently dropping a
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
 * One end cap, triangulated so no triangle spans two facets.
 *
 * The cast reads only a point's LATERAL offset, so facet boundaries are lines of constant lateral offset,
 * and the cap — which projects exactly onto the ring, every point traveling along the same axis — is a
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

/** One bar: sides between its two cut ends, and a cap on each. */
function buildBar(spans: Span[], axis: Vector3): BufferGeometry | null {
  if (spans.length < 3) return null;

  const buffers = createGeometryBuffers();
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  // Wound so the faces point OUT of the bar. Reverse this and the mesh is still watertight, still inside
  // the opening, still free of NaN — every structural check passes — and it renders inside out, showing
  // its back faces to the camera. Orientation is a separate property from closure, and the test for it is
  // the SIGNED VOLUME: positive means outward.
  for (let i = 0; i < spans.length; i++) {
    const j = (i + 1) % spans.length;
    pushQuad(
      buffers,
      [at(spans[i]!.back), at(spans[j]!.back), at(spans[j]!.front), at(spans[i]!.front)],
      undefined,
    );
  }
  capEnd(buffers, spans, (s) => s.front, axis, true);
  capEnd(buffers, spans, (s) => s.back, axis, false);
  return toBufferGeometry(buffers);
}

/**
 * Every bar of every family, each spanning the opening and cut into its boundary at both ends.
 *
 * Bars shorter than `minLength` are dropped: a chord barely longer than the stock is an offcut no glazier
 * would cut, and its ring would straddle the boundary anyway.
 */
export function buildLatticeBars(
  boundary: Vector2[],
  families: BarFamily[],
  profile: Vec2[],
  minLength: number,
): BufferGeometry[] {
  const parts: BufferGeometry[] = [];

  for (const family of families) {
    const angle = (family.angle * Math.PI) / 180;
    const axis = new Vector3(Math.cos(angle), Math.sin(angle), 0);
    const normal = new Vector2(-Math.sin(angle), Math.cos(angle));
    const flat = new Vector2(axis.x, axis.y);
    const phase = family.phase ?? 0;
    const step = Math.max(family.spacing, 1e-4);

    const offsets = boundary.map((p) => p.dot(normal));
    const from = Math.ceil((Math.min(...offsets) - phase) / step);
    const to = Math.floor((Math.max(...offsets) - phase) / step);

    for (let k = from; k <= to; k++) {
      const seed = normal.clone().multiplyScalar(k * step + phase);
      for (const [near, far] of lineChords(seed, flat, boundary)) {
        if (far - near < minLength) continue;

        const center = new Vector3(seed.x, seed.y, 0).addScaledVector(axis, (near + far) / 2);
        const station = miterFrames(linePath(center, center.clone().add(axis), 1), {
          reference: new Vector3(0, 0, 1),
        })[0]!;
        const ring = profile.map(([px, py]) =>
          station.position
            .clone()
            .addScaledVector(station.normal, px)
            .addScaledVector(station.binormal, py),
        );
        if (ring.some((p) => !insideBoundary(new Vector2(p.x, p.y), boundary))) continue;

        const bar = buildBar(spanOpening(ring, axis, boundary), axis);
        if (bar) parts.push(bar);
      }
    }
  }
  return parts;
}
