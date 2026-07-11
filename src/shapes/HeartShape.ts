import { Shape } from "three";

export interface HeartShapeOptions {
  /** Overall scale factor. Defaults to `1`. */
  size?: number;
  /** Heart width. Defaults to `2.1`. */
  width?: number;
  /** Heart height. Defaults to `1.4`. */
  height?: number;
  /** Depth of the bottom tip below the origin. Defaults to `1.6`. */
  tipDepth?: number;
}

/**
 * Heart profile — two bezier lobes meeting at a bottom tip.
 */
export class HeartShape extends Shape {
  constructor({ size = 1, width = 2.1, height = 1.4, tipDepth = 1.6 }: HeartShapeOptions = {}) {
    super();

    // Start from the top middle of the heart
    this.moveTo(0, (height * size) / 3);

    // Left curve
    this.bezierCurveTo(
      -width * 0.375 * size,
      height * size, // Control point 1 for the left lobe
      -width * size,
      (height * size) / 3, // Control point 2 for the left side of the heart
      0,
      -tipDepth * size, // Bottom tip of the heart, controlled by `tipDepth`
    );

    // Right curve
    this.bezierCurveTo(
      width * size,
      (height * size) / 3, // Control point 3 for the right side of the heart
      width * 0.375 * size,
      height * size, // Control point 4 for the right lobe
      0,
      (height * size) / 3, // Close shape at the top middle
    );
  }
}
