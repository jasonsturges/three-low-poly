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
  /**
   * How far the stem's sides bow INWARD, as a fraction of the way to the centerline. Defaults to `0.18`.
   *
   * `0` is a straight trapezoid; higher pinches the waist and flares the foot — the concave sweep of a
   * printed club. Same idea as {@link DiamondShapeOptions.concavity}, applied to the stem.
   */
  stemConcavity?: number;
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
    stemConcavity = 0.18,
  }: ClubShapeOptions = {}) {
    super();

    const x = (width / 2) * size; // half-width, at the widest of the side lobes
    const y = height * size; //      the crown of the top lobe
    const sw = (stemWidth / 2) * size;
    const sd = stemDepth * size;

    const waistX = 0.15 * x;
    const waistY = -0.32 * y;

    // Each stem side bows toward the centerline: its control point is the straight midpoint, pulled in
    // toward x = 0 by `stemConcavity`. At 0 the control sits on the line and the side stays straight.
    const k = 1 - stemConcavity;
    const cyMid = (waistY - sd) / 2;

    // Up the left of the stem (concave), across its foot, and up its right side (concave).
    this.moveTo(-waistX, waistY);
    this.quadraticCurveTo(((-waistX - sw) / 2) * k, cyMid, -sw, -sd);
    this.lineTo(sw, -sd);
    this.quadraticCurveTo(((sw + waistX) / 2) * k, cyMid, waistX, waistY);

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
