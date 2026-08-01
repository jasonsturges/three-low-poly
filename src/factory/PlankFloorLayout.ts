import { mulberry32 } from "../utils/Random";

export interface PlankFloorLayoutOptions {
  /** Extent along the direction the boards run. Defaults to `2.5`. */
  length?: number;
  /** Extent across the boards. Defaults to `2.5`. */
  depth?: number;
  /** Board width. Rows are fitted to `depth`, so the width actually laid is reported back. Defaults to `0.2`. */
  plankWidth?: number;
  /** Gap between rows. Defaults to `0.012`. */
  gap?: number;
  /**
   * Shortest board laid, in world units. Defaults to `0.5`.
   *
   * **Absolute, not a fraction of the floor**, because a board is milled at a real size: a larger room takes
   * *more* boards, not longer ones. Given either way round, and clamped to the floor.
   */
  minPlankLength?: number;
  /** Longest board laid, in world units. Defaults to `1.4`. */
  maxPlankLength?: number;
  /**
   * How far an end joint should stand clear of the joints in the row beside it, in world units. Defaults
   * to `0.35`. **The single rule that separates a laid floor from a set of stripes.**
   *
   * A TARGET, not a guarantee. Each board's length is chosen from a bounded search, so the clearance
   * actually achieved is reported back as {@link PlankFloorLayout.closestJoint} — expect roughly two
   * thirds of what is asked for, and read the result rather than assuming it.
   */
  minStagger?: number;
  /** Defaults to `0x51ab`. */
  seed?: number;
}

/** One board, as a position and a size. No geometry — what to build it from is the caller's business. */
export interface PlankPlacement {
  /** Distance from the run's start to this board's near end. */
  start: number;
  length: number;
  /** Which row, counting from the near edge. */
  row: number;
  /** The row's centre line, measured across the floor from its middle. */
  across: number;
  /** Laying order. Use it to derive a per-board seed and tint, so no two boards repeat. */
  sequence: number;
}

export interface PlankFloorLayout {
  placements: PlankPlacement[];
  rows: number;
  /** The width each board actually got, after the rows were fitted to `depth`. */
  plankWidth: number;
  /**
   * The closest any two neighbouring-row joints came — **what the floor actually got**, against what
   * `minStagger` asked for. Two things hold it down: the request is capped at `(longest − shortest) / 2`,
   * since a joint can only be moved by varying its board's length, and the per-board search is bounded, so
   * even inside the cap it lands short. Worth reading; a floor that came out at half its target is a floor
   * whose board range is too narrow for the room.
   */
  closestJoint: number;
}

/**
 * Lay a boarded floor — **where the boards go, not what they are made of.**
 *
 * Returns placements, so the same laying rules serve a floor of plain boxes, one of
 * {@link WeatheredPlankGeometry}, a ceiling, or a deck. The trade knowledge is here; the geometry is not.
 *
 * **The mistake that makes a plank floor read as stripes is spanning each board across the whole room.** A
 * real floor is laid in rows of *several* boards butted end to end, with the end joints in neighbouring
 * rows deliberately kept apart — the flooring trade's own rule, and the same idea as a running bond in
 * masonry. Board-to-board colour and shape variation cannot rescue a floor whose joints all line up, and is
 * barely needed once they do not.
 *
 * Two smaller rules come from the same trade. Each row opens with a **shortened starter board**, so rows do
 * not all begin their run together. And a row never ends on a **runt** — a remainder shorter than the
 * minimum is absorbed by the board before it.
 *
 * `minStagger` is capped at `(longest − shortest) / 2`. A joint can only be moved by varying its board's
 * length, so that is the furthest it can travel while still landing clear of an obstruction; asking for
 * more does not tighten the floor, it makes the search fail more often and the worst joint *worse*.
 *
 * @example
 * ```ts
 * const { placements, plankWidth } = layPlankFloor({ length: 4, depth: 3, seed: 7 });
 *
 * for (const { start, length, across, sequence } of placements) {
 *   const board = new BoxGeometry(length, thickness, plankWidth);
 *   board.translate(start + length / 2 - 2, -thickness / 2, across);
 * }
 * ```
 */
export function layPlankFloor({
  length = 2.5,
  depth = 2.5,
  plankWidth = 0.2,
  gap = 0.012,
  minPlankLength = 0.5,
  maxPlankLength = 1.4,
  minStagger = 0.35,
  seed = 0x51ab,
}: PlankFloorLayoutOptions = {}): PlankFloorLayout {
  const random = mulberry32(seed);

  // Take the range as given in either order, and let no board out-run the floor it is laid on — a length
  // longer than the room would silently become one board per row and undo the staggering entirely.
  const longest = Math.min(Math.max(minPlankLength, maxPlankLength), length);
  const shortest = Math.min(Math.max(Math.min(minPlankLength, maxPlankLength), 0.05), longest);
  const stagger = Math.min(minStagger, (longest - shortest) / 2);

  const rowPitch = plankWidth + gap;
  const rows = Math.max(1, Math.round(depth / rowPitch));
  const pitch = depth / rows;
  const laidWidth = Math.max(pitch - gap, 0.01);

  const placements: PlankPlacement[] = [];
  let previousJoints: number[] = [];
  let sequence = 0;
  let closestJoint = Infinity;

  for (let row = 0; row < rows; row++) {
    const across = -depth / 2 + (row + 0.5) * pitch;
    const joints: number[] = [];
    let cursor = 0;
    let first = true;

    while (cursor < length - 1e-4) {
      const remaining = length - cursor;

      // Sample candidate lengths and keep whichever puts its end joint furthest from the joints in the row
      // alongside. The score saturates at `stagger`, so a candidate that is already clear is taken
      // immediately rather than optimised past the point of mattering.
      //
      // 24 rather than a handful: measured over 40 seeds, 5 attempts reached a median clearance of 0.14
      // against a 0.35 target, 10 reached 0.23, and 24 reaches ~0.30 — after which it flattens. The whole
      // search runs once at construction, so the extra samples cost nothing anyone can see.
      let boardLength = remaining;
      let bestScore = -Infinity;

      for (let attempt = 0; attempt < 24; attempt++) {
        let candidate = shortest + random() * (longest - shortest);

        // A shortened opening board keeps rows from starting in step.
        if (first) candidate *= 0.3 + random() * 0.7;
        candidate = Math.max(candidate, shortest * 0.45);

        // Never leave a runt at the end of a row; absorb it into this board.
        if (remaining - candidate < shortest) candidate = remaining;

        const joint = cursor + candidate;
        let clearance = Infinity;
        for (const previous of previousJoints) {
          clearance = Math.min(clearance, Math.abs(previous - joint));
        }

        const score = Math.min(clearance, stagger);
        if (score > bestScore) {
          bestScore = score;
          boardLength = candidate;
        }
        if (score >= stagger) break;
      }

      boardLength = Math.min(boardLength, remaining);
      placements.push({ start: cursor, length: boardLength, row, across, sequence });

      cursor += boardLength;
      if (cursor < length - 1e-4) {
        joints.push(cursor);
        if (previousJoints.length > 0) {
          for (const previous of previousJoints) {
            closestJoint = Math.min(closestJoint, Math.abs(previous - cursor));
          }
        }
      }
      sequence++;
      first = false;
    }

    previousJoints = joints;
  }

  return {
    placements,
    rows,
    plankWidth: laidWidth,
    closestJoint: Number.isFinite(closestJoint) ? closestJoint : 0,
  };
}
