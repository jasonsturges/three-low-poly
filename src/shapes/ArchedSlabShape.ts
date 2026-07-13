import { Shape } from "three";

export interface ArchedSlabShapeOptions {
  /** Width of the slab. Defaults to `1.2`. */
  width?: number;
  /** Height of the rectangular body, up to where the arch springs. Defaults to `1.4`. */
  height?: number;
  /**
   * Span of the arch. Defaults to `width`.
   *
   * Equal to `width` gives a smooth line sweeping across the top — a door, or a window. Pull it in and
   * SHOULDERS appear at the corners, and the arch sits *on* the slab: a headstone. The shoulders are
   * not modelled; they are what is left over.
   */
  archWidth?: number;
  /** Rise of the arch above the springing. `archWidth / 2` is a Roman semicircle. Defaults to `0.6`. */
  archHeight?: number;
}

/**
 * A rectangle with an arched top.
 *
 * One outline for three things that look like three: a **door**, an arched **window**, and a
 * **headstone**. Only the arch's span changes.
 *
 * ```
 *   archWidth == width      a smooth line across the top        -> a door, a window
 *
 *   archWidth <  width           /\     the arch sits ON the slab,
 *                             ___/  \___  leaving shoulders     -> a headstone
 *                            |          |
 * ```
 *
 * The arch is an ELLIPSE, not a circle, so its rise is independent of its span: a squat Roman arch and
 * a tall pointed one are the same outline with a different `archHeight`.
 *
 * Note this is a FILLED outline, not a swept band. An archway you walk through is a sweep — it follows
 * the curve. A door is an extrude — it fills it. Same arc, different operation.
 */
export class ArchedSlabShape extends Shape {
  constructor({
    width = 1.2,
    height = 1.4,
    archWidth = width,
    archHeight = 0.6,
  }: ArchedSlabShapeOptions = {}) {
    super();

    const hw = width / 2;
    const ha = Math.min(archWidth, width) / 2;

    // Counter-clockwise, starting bottom-left: along the floor, up the right side...
    this.moveTo(-hw, 0);
    this.lineTo(hw, 0);
    this.lineTo(hw, height);

    // ...in along the right shoulder, when the arch is narrower than the slab. When it is not, this is
    // a zero-length step, and a duplicate point is exactly what a triangulator does not need to see.
    if (ha < hw) this.lineTo(ha, height);

    // ...over the top...
    this.absellipse(0, height, ha, archHeight, 0, Math.PI, false);

    // ...back out along the left shoulder, and close down the left side.
    if (ha < hw) this.lineTo(-hw, height);
    this.closePath();
  }
}
