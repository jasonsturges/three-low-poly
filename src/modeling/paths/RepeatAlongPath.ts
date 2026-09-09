import type { PathMeasure } from "./PathMeasure";

/** corners adjusts spacing per segment to place an item at each vertex; pitch keeps fixed spacing from the start. */
export type RepeatAnchor = "corners" | "pitch";

export interface RepeatAlongPathOptions {
  /** Requested center-to-center distance, greater than zero. */
  pitch: number;
  /** How spacing handles a remainder along the measured path. */
  anchor?: RepeatAnchor;
}

export interface PathRepeat {
  /** Item centers, as distances along the path. Feed each to `slicePath` or `pointAtDistance`. */
  centers: number[];
  /** Actual pitch; corners reports total spanned length / step count, an average across segments. */
  pitch: number;
  /** Unallocated distance under pitch anchoring; zero under corners anchoring. */
  slack: number;
  /** Whether every vertex ended up with an item on it. */
  anchored: boolean;
}

/**
 * Return item-center distances and spacing metadata. Use pointAtDistance for placement or
 * slicePath(center ± width / 2) for an item spanning multiple segments.
 *
 * ```ts
 * const plan = measurePath(footprint, { closed: true });
 * const { centers } = repeatAlongPath(plan, { pitch: 1.2 });
 *
 * // A battlement: the interval, swept. Corner merlons need no special case — their slice comes back
 * // with the corner in it, and `miterFrames` cuts it.
 * const merlons = centers.map((c) =>
 *   sweep(
 *     section,
 *     miterFrames(
 *       slicePath(plan, c - 0.4, c + 0.4).map((position) => ({ position, tangent: new Vector3() })),
 *       { reference: new Vector3(0, 1, 0) },
 *     ),
 *   ),
 * );
 *
 * // A balustrade: the center, populated.
 * for (const c of centers) baluster.position.copy(pointAtDistance(plan, c));
 * ```
 */
export function repeatAlongPath(
  { points, closed, distances, length }: PathMeasure,
  { pitch, anchor = "corners" }: RepeatAlongPathOptions,
): PathRepeat {
  if (!(pitch > 0)) throw new Error("repeatAlongPath: pitch must be greater than zero.");

  if (anchor === "pitch") {
    const count = Math.max(1, Math.floor(length / pitch));
    return {
      centers: Array.from({ length: count }, (_, i) => i * pitch),
      pitch,
      slack: length - count * pitch,
      anchored: false,
    };
  }

  const centers: number[] = [];
  let spanned = 0;
  let steps = 0;
  const segments = closed ? points.length : points.length - 1;

  for (let i = 0; i < segments; i++) {
    const segment = distances[i + 1]! - distances[i]!;
    // At least one step, so a segment shorter than the pitch still gets its corners rather than vanishing.
    const count = Math.max(1, Math.round(segment / pitch));
    const actual = segment / count;
    spanned += segment;
    steps += count;

    // Emit shared corners once; only the last open segment includes its far endpoint.
    const emit = closed || i < segments - 1 ? count : count + 1;
    for (let k = 0; k < emit; k++) centers.push(distances[i]! + k * actual);
  }

  return { centers, pitch: spanned / steps, slack: 0, anchored: true };
}
