import { Path, Shape } from "three";
import { ArchStyle, archRise, traceArch } from "./ArchProfile";

/** An opening in a wall — a doorway or a window. The same description; a different way in. */
export interface WallOpeningOptions {
  /** Width of the opening. Defaults to `1.2`. */
  width?: number;
  /** Height of the straight sides, up to where the arch springs. Defaults to `1.4`. */
  height?: number;
  /**
   * Rise of the arch above the springing. Defaults to half the width — a semicircle.
   *
   * A radius, not an angle. Some styles override it: `square` has none, `semicircle` forces it.
   */
  archHeight?: number;
  /** Which arch tops the opening. Defaults to `semicircle`. See {@link ArchStyle}. */
  arch?: ArchStyle;
  /** Where the opening sits across the wall. Defaults to `0` — centered. */
  x?: number;
  /** **Windows only.** Height of the sill above the wall's base. A doorway's sill IS the floor. */
  y?: number;
}

export interface WallShapeOptions {
  /** Width of the wall. Defaults to `4`. */
  width?: number;
  /** Height of the wall. Defaults to `3`. */
  height?: number;
  /** An opening that reaches the floor. Carved into the OUTLINE. Omit for a solid wall. */
  doorway?: WallOpeningOptions;
  /** Openings that float clear of every edge. Punched as HOLES. */
  windows?: WallOpeningOptions[];
  /** Raw holes, for shapes this class does not describe. Appended to {@link windows}. */
  holes?: Path[];
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
 * Doorways and windows are described identically and topped by any {@link ArchStyle} — the difference is
 * only which way in they take. A door built from the same `width` / `height` / `archHeight` / `arch` as
 * the doorway will match it exactly, since both draw the same arc; give the opening a hair more for
 * clearance.
 *
 * @example
 * ```ts
 * const wall = new WallShape({
 *   width: 6,
 *   height: 4,
 *   doorway: { width: 1.3, arch: "semicircle" },
 *   windows: [
 *     { width: 0.7, height: 0.9, arch: "ogee", x: -2, y: 1.6 },
 *     { width: 0.7, height: 0.9, arch: "ogee", x: 2, y: 1.6 },
 *   ],
 * });
 *
 * const geometry = new ExtrudeGeometry(wall, { depth: 0.3, bevelEnabled: false });
 * ```
 */
export class WallShape extends Shape {
  constructor({ width = 4, height = 3, doorway, windows, holes }: WallShapeOptions = {}) {
    super();

    const hw = width / 2;

    // Counter-clockwise from the bottom-left, along the floor...
    this.moveTo(-hw, 0);

    if (doorway) {
      const { half, springing, x } = resolve(doorway, width);

      // ...but the floor stops at the near jamb. Up and over the opening, and back down to the floor on
      // the far side: the wall walks AROUND the doorway rather than cutting it out.
      this.lineTo(x - half, 0);
      this.lineTo(x - half, springing);

      // Left to right, because the outline is travelling that way along the top of the opening.
      traceArch(this, { ...archOf(doorway, half, springing), x, from: "left", to: "right" });

      this.lineTo(x + half, 0);
    }

    // ...on along the floor, up the far side, and back across the top.
    this.lineTo(hw, 0);
    this.lineTo(hw, height);
    this.lineTo(-hw, height);
    this.closePath();

    // Windows never touch an edge, so these are genuine holes and `holes` is exactly right for them.
    for (const window of windows ?? []) this.holes.push(windowPath(window, width));
    if (holes) this.holes.push(...holes);
  }
}

/** An opening's half-width, springing height, and centerline — clamped to the wall it lives in. */
function resolve(opening: WallOpeningOptions, wallWidth: number) {
  const { width = 1.2, height = 1.4, x = 0, y = 0 } = opening;
  return { half: Math.min(width, wallWidth) / 2, springing: y + height, x, sill: y };
}

function archOf(opening: WallOpeningOptions, half: number, springing: number) {
  const { arch = "semicircle", archHeight } = opening;
  return { style: arch, y: springing, halfSpan: half, rise: archHeight ?? half };
}

/**
 * A window, as a hole. Wound CLOCKWISE — the reverse of the wall's outline, which is what tells the
 * triangulator this is a void rather than another island of material.
 */
function windowPath(opening: WallOpeningOptions, wallWidth: number): Path {
  const { half, springing, x, sill } = resolve(opening, wallWidth);
  const profile = archOf(opening, half, springing);

  const path = new Path();
  path.moveTo(x - half, sill);
  path.lineTo(x - half, springing);

  // Over the top, left to right...
  traceArch(path, { ...profile, x, from: "left", to: "right" });

  // ...and back down the far jamb to the sill. Unlike a doorway, a window HAS a bottom edge — it is
  // interior, so that edge extrudes into a real sill face instead of a face lying across your floor.
  path.lineTo(x + half, sill);
  path.closePath();

  return path;
}

/** The crown of an opening, measured from the wall's base. Useful for checking it clears the wall. */
export function wallOpeningTop(opening: WallOpeningOptions, wallWidth = Infinity): number {
  const { half, springing } = resolve(opening, wallWidth);
  return springing + archRise(archOf(opening, half, springing));
}
