import { Path, Shape } from "three";

export interface WallDoorwayOptions {
  /** Width of the opening. Defaults to `1.2`. */
  width?: number;
  /** Height of the opening's straight sides, up to where the arch springs. Defaults to `1.4`. */
  height?: number;
  /**
   * Rise of the arch above the springing. `width / 2` is a perfect semicircle — see
   * {@link ArchedSlabShapeOptions.archHeight}. `0` gives a square-headed opening. Defaults to `0.6`.
   */
  archHeight?: number;
  /** Where the opening sits across the wall. Defaults to `0` — centered. */
  x?: number;
}

export interface WallShapeOptions {
  /** Width of the wall. Defaults to `4`. */
  width?: number;
  /** Height of the wall. Defaults to `3`. */
  height?: number;
  /** An opening that reaches the floor. Carved into the OUTLINE. Omit for a solid wall. */
  doorway?: WallDoorwayOptions;
  /** Openings that float clear of every edge. Pushed into `holes`. */
  windows?: Path[];
}

/**
 * A wall, with a doorway carved out of it and windows punched through it — and those are **not the same
 * operation**, which is the entire reason this shape exists.
 *
 * ```
 *    ______________________          A WINDOW is strictly interior: the wall
 *   |    ___               |         completely surrounds it. That is a HOLE.
 *   |   |   |    ______    |
 *   |   |___|   /      \   |         A DOORWAY reaches the floor. It touches the
 *   |          |        |  |         boundary, so it is NOT a hole — it is a notch
 *   |__________|        |__|         in the wall's own OUTLINE.
 * ```
 *
 * **Why a doorway cannot be a hole.** `Shape.holes` promises the triangulator a void it can enclose, and
 * it breaks in two ways when the void touches an edge. The triangulator bridges each hole to the outer
 * contour, and with the contours coincident that seam is degenerate — it will fill straight across your
 * threshold. Worse, and unavoidably: `ExtrudeGeometry` builds side walls along **every contour, holes
 * included**. A doorway-as-hole has a bottom segment lying in the sill, so extruding it produces a
 * horizontal face spanning the doorway at floor level. You cannot triangulate your way out of that one.
 * You asked for an edge there, so you got a face.
 *
 * Drawing the doorway into the outline means **there is no edge across the threshold at all**, so the
 * face never exists to be removed. And the notch's side walls become the REVEALS — the jamb faces and
 * the arch soffit — which is what a real doorway has and what you would otherwise have to fake.
 *
 * The rule generalizes: **an interior void is a hole; a void that touches the boundary belongs to the
 * outline.** It is the same rule that makes an arched door's arch part of its silhouette rather than
 * something cut out of a rectangle.
 *
 * The doorway's arch is the same ellipse an {@link ArchedSlabShape} draws, so a wall and the door that
 * hangs in it agree exactly when they are given the same `width` / `height` / `archHeight`. Give the
 * opening a hair more than the door for clearance.
 *
 * @example
 * ```ts
 * const wall = new WallShape({
 *   width: 4,
 *   height: 3,
 *   doorway: { width: 1.24, height: 1.42, archHeight: 0.62 }, // archHeight = width/2: a semicircle
 * });
 *
 * const geometry = new ExtrudeGeometry(wall, { depth: 0.4, bevelEnabled: false });
 * ```
 */
export class WallShape extends Shape {
  constructor({ width = 4, height = 3, doorway, windows }: WallShapeOptions = {}) {
    super();

    const hw = width / 2;

    // Counter-clockwise from the bottom-left, along the floor...
    this.moveTo(-hw, 0);

    if (doorway) {
      const { width: dw = 1.2, height: dh = 1.4, archHeight = 0.6, x = 0 } = doorway;
      const half = Math.min(dw, width) / 2;

      // ...but the floor stops at the near jamb. Up and over the opening, and back down to the floor on
      // the far side: the wall walks AROUND the doorway rather than cutting it out.
      this.lineTo(x - half, 0);
      this.lineTo(x - half, dh);

      // Over the arch, right to left in parameter space — π to 0, which sweeps through the crown.
      if (archHeight > 0) this.absellipse(x, dh, half, archHeight, Math.PI, 0, true);
      else this.lineTo(x + half, dh); // a square-headed opening

      this.lineTo(x + half, 0);
    }

    // ...on along the floor, up the far side, and back across the top.
    this.lineTo(hw, 0);
    this.lineTo(hw, height);
    this.lineTo(-hw, height);
    this.closePath();

    // Windows never touch an edge, so these are genuine holes and `holes` is exactly right for them.
    if (windows) this.holes.push(...windows);
  }
}
