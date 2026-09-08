import { Vector3 } from "three";

/**
 * A polyline with its arc lengths worked out, so positions along it can be asked for by DISTANCE rather
 * than by vertex index.
 *
 * Produced by {@link measurePath}. Treat it as immutable — it caches distances that would be wrong if the
 * points moved underneath it.
 */
export interface PathMeasure {
  /** The vertices, in order. Not copied: the caller still owns them. */
  points: Vector3[];
  /** Whether the last vertex joins back to the first. */
  closed: boolean;
  /**
   * Arc length at each vertex, with ONE EXTRA entry holding the total — so `distances[i + 1] -
   * distances[i]` is always segment `i`'s length, including the closing segment of a closed run.
   */
  distances: number[];
  /** Total arc length. The perimeter, for a closed run. */
  length: number;
}

export interface MeasurePathOptions {
  /** Join the last vertex back to the first. Defaults to `false`. */
  closed?: boolean;
}

/**
 * Work out the arc lengths along a polyline.
 *
 * Everything else here needs this first, because a run is laid out by DISTANCE — a pitch is a distance, an
 * item's width is a distance — and a list of vertices does not know where any distance falls.
 *
 * @example
 * ```ts
 * const plan = measurePath(footprint, { closed: true });
 * plan.length; // the perimeter
 * ```
 */
export function measurePath(points: Vector3[], { closed = false }: MeasurePathOptions = {}): PathMeasure {
  if (points.length < 2) throw new Error("measurePath: a path needs at least two points.");

  const distances = [0];
  const segments = closed ? points.length : points.length - 1;
  for (let i = 0; i < segments; i++) {
    distances.push(distances[i]! + points[i]!.distanceTo(points[(i + 1) % points.length]!));
  }
  return { points, closed, distances, length: distances[distances.length - 1]! };
}

/**
 * The position a given distance along the path.
 *
 * On a **closed** path the distance wraps, so `-0.1` and `length - 0.1` are the same place — which is what
 * lets an item straddle the seam without special handling. On an **open** path it clamps to the ends.
 */
export function pointAtDistance({ points, closed, distances, length }: PathMeasure, distance: number): Vector3 {
  const target = closed
    ? ((distance % length) + length) % length
    : Math.min(Math.max(distance, 0), length);

  let i = 0;
  while (i < distances.length - 2 && distances[i + 1]! <= target) i++;

  const a = points[i]!;
  const b = points[(i + 1) % points.length]!;
  const span = distances[i + 1]! - distances[i]!;
  return a.clone().lerp(b, span > 1e-12 ? (target - distances[i]!) / span : 0);
}

/**
 * The stretch of path between two distances, **including any vertices it crosses**.
 *
 * That inclusion is the whole point, and it is what makes an item sitting on a corner cost nothing extra.
 * A slice that stays on one segment comes back as two points; one that spans a corner comes back as
 * three, and {@link miterFrames} then miters the middle exactly as it would on a long run. So a merlon or
 * a dentil landing on a corner is an L in plan without a line of code that knows what a corner is.
 *
 * `to` must be greater than `from`. Both may fall outside `[0, length]` on a closed path — `slicePath(m,
 * -0.05, 0.05)` is the slice straddling the start, which is exactly what a corner-anchored item asks for.
 *
 * @example
 * ```ts
 * // One merlon, wherever it happens to land.
 * const merlon = sweep(section, miterFrames(
 *   slicePath(plan, center - width / 2, center + width / 2).map((p) => ({ position: p, tangent: new Vector3() })),
 *   { reference: new Vector3(0, 1, 0) },
 * ));
 * ```
 */
export function slicePath(measure: PathMeasure, from: number, to: number): Vector3[] {
  if (!(to > from)) throw new Error("slicePath: `to` must be greater than `from`.");

  const { points, closed, distances, length } = measure;
  const span = to - from;
  const out = [pointAtDistance(measure, from)];

  // Every vertex, expressed as how far past `from` it sits — wrapped on a closed run so the seam is not a
  // special case. Only those strictly inside the span count; one exactly on an end is already there.
  const crossed: { at: number; point: Vector3 }[] = [];
  for (let i = 0; i < points.length; i++) {
    let at = distances[i]! - from;
    if (closed) at = ((at % length) + length) % length;
    if (at > 1e-9 && at < span - 1e-9) crossed.push({ at, point: points[i]!.clone() });
  }
  crossed.sort((a, b) => a.at - b.at);

  out.push(...crossed.map((c) => c.point), pointAtDistance(measure, to));
  return out;
}
