import { mulberry32 } from "../utils/Random";

/** A rectangle on the surface, from its lower-left corner. Used to keep stones off things. */
export interface SurfaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProudStoneOptions {
  /** Extent of the surface being decorated. Defaults to `3.2`. */
  width?: number;
  /** Defaults to `2.6`. */
  height?: number;

  /**
   * The course grid the stones must land on. Defaults to `0.26`.
   *
   * Not decoration — a proud stone has to sit ON a stone rather than across a joint, so it needs the same
   * grid the wall was built to. Give it the wall's own numbers.
   */
  courseHeight?: number;
  /** A whole stone's length, as a multiple of the course. Defaults to `2.2`. */
  stoneAspect?: number;
  /** How far alternate courses start along a stone. Defaults to `0.5`. */
  bondOffset?: number;

  /**
   * Chance a cell carries a proud stone. Defaults to `0.14`.
   *
   * A chance PER CELL, not a count — the grid stays regular and the result does not clump the way sampling
   * positions at random would.
   */
  density?: number;

  /**
   * Length range, as multiples of a whole stone. Defaults to `0.72`–`1.12`.
   *
   * **The brick/stone dial.** Collapse a range and every proud stone is the same unit that has popped,
   * which is brick; open it and each came from its own mould, which is stone.
   */
  lengthMin?: number;
  lengthMax?: number;
  /** Height range, as multiples of the course. Defaults to `0.8`–`0.92`. */
  heightMin?: number;
  heightMax?: number;
  /** How far it stands out of the surface, in world units. Defaults to `0.024`–`0.056`. */
  depthMin?: number;
  depthMax?: number;

  /** Max roll, radians. Defaults to `0.025`. */
  tilt?: number;
  /**
   * Rectangles nothing may be placed across — an opening, a quoin, a doorway.
   *
   * **This is what lets the scatter stay a surface operation.** Its only two wall-aware rules were "not on
   * a quoin" and "not across a slit", and both are COMPOSITION rather than masonry. Handed in, the scatter
   * composes with anything without ever learning what it is composing with.
   */
  exclusions?: SurfaceRect[];
  /** Defaults to `0x2c1a`. */
  seed?: number;
}

/** One stone standing proud. Where and how big — what it is made of is the caller's business. */
export interface ProudStone {
  /** Centre on the surface, from its lower-left corner. */
  x: number;
  y: number;
  /** Along the course — the stretcher face. */
  length: number;
  /** Up — the course. */
  height: number;
  /** How far it stands out of the surface. */
  depth: number;
  /** Roll, radians. */
  tilt: number;
}

export interface ProudStoneScatter {
  placements: ProudStone[];
  /** Cells considered. `placements.length / candidates` is the density actually achieved. */
  candidates: number;
  /** Cells skipped for landing on an exclusion. */
  excluded: number;
}

/**
 * Where stones stand proud of a surface.
 *
 * **Takes a rectangle, not a wall.** A width, a height and a course grid is everything it needs, so the
 * same call decorates a wall, a pier, a chimney, a plinth or an arched slab. Returns placements rather
 * than geometry, so the caller decides how far each block sinks and what it is made of.
 *
 * **The block must be half-embedded, not sat on the face.** Build each one deeper than its `depth` and
 * push it out by exactly `depth`, leaving the rest buried:
 *
 * ```ts
 * const solid = new BoxGeometry(length, height, stoneWidth);
 * solid.rotateZ(tilt);
 * solid.translate(x, y, surfaceThickness / 2 + depth - stoneWidth / 2);
 * ```
 *
 * Sunk further than it stands out, so the join at its foot is inside solid material rather than on it and
 * no two faces land coplanar. Flush-backed, it becomes a sticker: same silhouette, wrong shadow.
 *
 * Every dimension is a MULTIPLIER on the course rather than an absolute, so one set of numbers reads the
 * same on a garden wall and a bell tower.
 *
 * **Distinct from {@link StoneWall}'s own `proudChance`, and both are right.** The wall MOVES stones it
 * already has; this ADDS blocks to a surface. Use the wall's when the face is built from real stones, and
 * this when it is a slab you cannot take apart.
 *
 * @example
 * ```ts
 * const { placements } = scatterProudStones({
 *   width: 3.2,
 *   height: 2.6,
 *   density: 0.14,
 *   exclusions: [{ x: 1.1, y: 0.8, width: 0.9, height: 1.4 }], // a window
 * });
 * ```
 */
export function scatterProudStones({
  width = 3.2,
  height = 2.6,
  courseHeight = 0.26,
  stoneAspect = 2.2,
  bondOffset = 0.5,
  density = 0.14,
  lengthMin = 0.72,
  lengthMax = 1.12,
  heightMin = 0.8,
  heightMax = 0.92,
  depthMin = 0.024,
  depthMax = 0.056,
  tilt = 0.025,
  exclusions = [],
  seed = 0x2c1a,
}: ProudStoneOptions = {}): ProudStoneScatter {
  const random = mulberry32(seed);
  const signed = (amount: number) => (random() - 0.5) * 2 * amount;
  // Ranges given either way round, because a slider pair will cross sooner or later.
  const between = (min: number, max: number) =>
    Math.min(min, max) + random() * Math.abs(max - min);

  const courses = Math.max(1, Math.round(height / courseHeight));
  const step = height / courses;
  const nominal = step * stoneAspect;

  const placements: ProudStone[] = [];
  let candidates = 0;
  let excluded = 0;

  for (let c = 0; c < courses; c++) {
    const y = (c + 0.5) * step;
    // The same running bond the wall itself uses, so a proud stone lands ON a stone rather than across a
    // perpend. This is the whole reason it needs the course grid and not merely the rectangle.
    const offset = (c % 2) * nominal * bondOffset;

    for (let s = 0; ; s++) {
      const x = offset + s * nominal;
      if (x + nominal > width) break;
      candidates++;

      // A stone hanging across an opening would float in the gap.
      const clash = exclusions.some(
        (rect) =>
          x + nominal > rect.x &&
          x < rect.x + rect.width &&
          y + step / 2 > rect.y &&
          y - step / 2 < rect.y + rect.height,
      );
      if (clash) {
        excluded++;
        continue;
      }

      if (random() > density) continue;

      placements.push({
        x: x + nominal / 2,
        y: y + signed(step * 0.03),
        length: nominal * between(lengthMin, lengthMax),
        height: step * between(heightMin, heightMax),
        depth: between(depthMin, depthMax),
        tilt: signed(tilt),
      });
    }
  }

  return { placements, candidates, excluded };
}
