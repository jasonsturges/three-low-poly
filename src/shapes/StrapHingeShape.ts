import { Shape } from "three";

export interface StrapHingeShapeOptions {
  /** How far the strap reaches across the door, from the pin to the tip. Defaults to `0.85`. */
  length?: number;
  /** Width at the pin, where the strap is widest. Defaults to `0.22`. */
  width?: number;
  /**
   * How far the strap's edges bow INWARD, as a fraction of the half-width. Defaults to `0.28`.
   *
   * At `0.5` the sides are straight and you get a dull triangle. Below that they curve in, and it
   * starts to look forged — a smith DRAWS the metal out, and the taper of drawn metal is a curve, not
   * a chamfer. This one number is most of the strap's character.
   */
  sweep?: number;
}

/**
 * A wrought strap hinge — wide at the pin, drawn out to a point, with its sides bowing inward.
 *
 * Drawn counter-clockwise from the pin edge, which is the straight one: the strap hangs off the door's
 * hinge side and reaches across its face.
 *
 * Local frame: the pin edge on X=0, centered on Y, reaching +X.
 */
export class StrapHingeShape extends Shape {
  constructor({ length = 0.85, width = 0.22, sweep = 0.28 }: StrapHingeShapeOptions = {}) {
    super();

    const hw = width / 2;

    this.moveTo(0, -hw);
    this.lineTo(0, hw); // the straight edge, against the pin

    // Out to the tip and back. Each control point is pulled toward the centerline by `sweep`, which is
    // what bows the edge inward instead of running it straight.
    this.quadraticCurveTo(length * 0.55, hw * sweep, length, 0);
    this.quadraticCurveTo(length * 0.55, -hw * sweep, 0, -hw);

    this.closePath();
  }
}
