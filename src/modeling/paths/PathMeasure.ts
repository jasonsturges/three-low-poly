import { Vector3 } from "three";

/** Cached polyline distances; points remain caller-owned and must stay fixed while the measure is used. */
export interface PathMeasure {
  /** The vertices, in order. Not copied: the caller still owns them. */
  points: Vector3[];
  /** Whether the last vertex joins back to the first. */
  closed: boolean;
  /** Cumulative vertex distances plus a final total: distances[i + 1] - distances[i] is segment i length. */
  distances: number[];
  /** Total arc length. The perimeter, for a closed run. */
  length: number;
}

export interface MeasurePathOptions {
  /** Include the closing segment from last point to first. */
  closed?: boolean;
}

/**
 * Cache cumulative chord distances for at least two points. Closed-path sampling requires positive total length.
 *
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

/** Return a point at distance; closed paths wrap (-0.1 equals length - 0.1), open paths clamp. */
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
 * Return endpoints and crossed vertices in distance order; to must exceed from.
 * Closed ranges can cross the seam; each source vertex is included at most once, even over multiple laps.
 *
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

  // Include only vertices strictly inside the interval; endpoint samples already exist.
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
