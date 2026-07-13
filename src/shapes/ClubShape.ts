import { Shape } from "three";

export interface ClubShapeOptions {
  /** Overall scale factor. Defaults to `1`. */
  size?: number;
  /** Club width across the side lobes. Defaults to `1.84`. */
  width?: number;
  /** Height of the top lobe above the origin. Defaults to `1`. */
  height?: number;
  /** Stem width. Defaults to `0.56`. */
  stemWidth?: number;
  /** Depth of the stem below the origin. Defaults to `0.85`. */
  stemDepth?: number;
}

/**
 * Club profile — three lobes on a stem, drawn counter-clockwise from the stem.
 *
 * The lobes are bezier bulges rather than true circles: circles have to be tangent to each other or
 * they leave a notch where they meet, and pinning that down turns a silhouette into a solved
 * equation. Bezier lobes just overlap, and you can move them.
 */
export class ClubShape extends Shape {
  constructor({
    size = 1,
    width = 1.84,
    height = 1,
    stemWidth = 0.56,
    stemDepth = 0.85,
  }: ClubShapeOptions = {}) {
    super();

    const x = (width / 2) * size; // half-width, at the widest of the side lobes
    const y = height * size; //      the crown of the top lobe
    const sw = (stemWidth / 2) * size;
    const sd = stemDepth * size;

    const waistX = 0.15 * x;
    const waistY = -0.32 * y;

    // Up the left of the stem, across its foot, and up its right side.
    this.moveTo(-waistX, waistY);
    this.lineTo(-sw, -sd);
    this.lineTo(sw, -sd);
    this.lineTo(waistX, waistY);

    // The right lobe: out, and up.
    this.bezierCurveTo(0.46 * x, -0.3 * y, 1.0 * x, -0.3 * y, 1.0 * x, 0.05 * y);
    this.bezierCurveTo(1.0 * x, 0.42 * y, 0.52 * x, 0.52 * y, 0.37 * x, 0.38 * y);

    // Over the top lobe.
    this.bezierCurveTo(0.52 * x, 0.62 * y, 0.41 * x, 1.0 * y, 0, 1.0 * y);
    this.bezierCurveTo(-0.41 * x, 1.0 * y, -0.52 * x, 0.62 * y, -0.37 * x, 0.38 * y);

    // Down the left lobe, back to the stem.
    this.bezierCurveTo(-0.52 * x, 0.52 * y, -1.0 * x, 0.42 * y, -1.0 * x, 0.05 * y);
    this.bezierCurveTo(-1.0 * x, -0.3 * y, -0.46 * x, -0.3 * y, -waistX, waistY);

    this.closePath();
  }
}
