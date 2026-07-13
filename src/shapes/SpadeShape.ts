import { Shape } from "three";

export interface SpadeShapeOptions {
  /** Overall scale factor. Defaults to `1`. */
  size?: number;
  /** Spade width across the lobes. Defaults to `1.9`. */
  width?: number;
  /** Height of the point above the origin. Defaults to `1`. */
  height?: number;
  /** Stem width. Defaults to `0.6`. */
  stemWidth?: number;
  /** Depth of the stem below the origin. Defaults to `0.75`. */
  stemDepth?: number;
}

/**
 * Spade profile — a heart inverted onto a stem, drawn counter-clockwise from the point.
 *
 * The card suit, and the terminal a smith forges onto the end of a strap hinge. Same outline, two
 * traditions.
 */
export class SpadeShape extends Shape {
  constructor({
    size = 1,
    width = 1.9,
    height = 1,
    stemWidth = 0.6,
    stemDepth = 0.75,
  }: SpadeShapeOptions = {}) {
    super();

    const x = (width / 2) * size; // half-width, at the widest of the lobes
    const y = height * size; //      the point
    const sw = (stemWidth / 2) * size;
    const sd = stemDepth * size;

    // From the point, down the left lobe, around, into the stem, and back up the right.
    this.moveTo(0, y);

    // Left shoulder, then around the left lobe and in to the waist.
    this.bezierCurveTo(-0.16 * x, 0.55 * y, -0.58 * x, 0.5 * y, -0.76 * x, 0.2 * y);
    this.bezierCurveTo(-1.0 * x, -0.15 * y, -0.58 * x, -0.5 * y, -0.17 * x, -0.28 * y);

    // The stem.
    this.lineTo(-sw, -sd);
    this.lineTo(sw, -sd);
    this.lineTo(0.17 * x, -0.28 * y);

    // Around the right lobe, and back up to the point.
    this.bezierCurveTo(0.58 * x, -0.5 * y, 1.0 * x, -0.15 * y, 0.76 * x, 0.2 * y);
    this.bezierCurveTo(0.58 * x, 0.5 * y, 0.16 * x, 0.55 * y, 0, y);

    this.closePath();
  }
}
