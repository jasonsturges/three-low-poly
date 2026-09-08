import type { PathMeasure } from "./PathMeasure";

/**
 * Where the layout is allowed to give, when a run does not divide evenly by the pitch.
 *
 * - `"corners"` — every VERTEX gets an item, and the pitch shifts to make that true. Each segment is
 *   divided into a whole number of steps independently, so unequal sides each solve themselves. This is
 *   how a course is really set out: a battlement has a merlon on every corner, a balustrade has a newel
 *   there, and neither is a sliced one. On an open run the two ends count as corners too.
 * - `"pitch"` — the requested pitch is held exactly and the run is walked from its start. Whatever fails
 *   to divide evenly piles into the final gap, and the corners land wherever they land.
 *
 * Nothing else can absorb it. The slack has to go into the pitch, into a gap, or into the items, and the
 * items are atomic — a half dentil is not a dentil.
 */
export type RepeatAnchor = "corners" | "pitch";

export interface RepeatAlongPathOptions {
  /**
   * Center to center, as a distance. **The invariant a course is designed around** — not the gap, which
   * is a consequence of the pitch and the item's width.
   */
  pitch: number;
  /** What gives when the run does not divide evenly. Defaults to `"corners"`. See {@link RepeatAnchor}. */
  anchor?: RepeatAnchor;
}

export interface PathRepeat {
  /** Item centers, as distances along the path. Feed each to `slicePath` or `pointAtDistance`. */
  centers: number[];
  /**
   * The pitch actually used. Equal to the request only when the run happened to divide evenly — with
   * `"corners"` this is the average across segments, which may differ per segment when the sides do.
   */
  pitch: number;
  /** What could not be divided evenly and was dumped into one gap. Always `0` under `"corners"`. */
  slack: number;
  /** Whether every vertex ended up with an item on it. */
  anchored: boolean;
}

/**
 * Space repeated items along a path, and report what the spacing cost.
 *
 * **This returns numbers, not geometry** — deliberately. What you do with a center decides which family
 * you are building, and the layout is identical either way:
 *
 * - a **notched band** (merlon/crenel, dentil/interdentil) uses each item's INTERVAL: pass
 *   `center ± width / 2` to {@link slicePath} and sweep the result. The gap is a real member, which is
 *   why those courses have a word for it.
 * - an **applied repeat** (baluster, modillion) uses only the CENTER: {@link pointAtDistance} and place
 *   an object there. There is no gap member, because there is nothing between the items but air.
 *
 * That split also decides how to bake them. A notched band's items DIFFER — the corner one spans two
 * segments — so they merge into one geometry and cannot be instanced. An applied repeat's items are
 * identical, so instancing is right and merging would only duplicate them.
 *
 * @example
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

    // Stop one short: this segment's far end is the NEXT segment's start, and on a closed run the last
    // one is the first. Emitting it would stack two items on every corner.
    const emit = closed || i < segments - 1 ? count : count + 1;
    for (let k = 0; k < emit; k++) centers.push(distances[i]! + k * actual);
  }

  return { centers, pitch: spanned / steps, slack: 0, anchored: true };
}
