import { Shape } from "three";

export interface BurstShapeOptions {
  /** Number of burst points. Defaults to `5`. */
  points?: number;
  /** Inner vertex radius. Defaults to `0.5`. */
  innerRadius?: number;
  /** Outer vertex radius. Defaults to `1`. */
  outerRadius?: number;
  /** Rotation in radians from the resting state. Defaults to `0`. */
  rotation?: number;
}

/**
 * Starburst profile — radial points joined by concave quadratic curves.
 *
 * Rests with a point up.
 */
export class BurstShape extends Shape {
  constructor({ points = 5, innerRadius = 0.5, outerRadius = 1.0, rotation = 0 }: BurstShapeOptions = {}) {
    super();

    const step = (Math.PI * 2) / points;
    const halfStep = step / 2;
    const qtrStep = step / 4;
    const start = Math.PI / 2 + rotation;

    // Control points ride a circle secant to the inner radius, bowing each edge inward.
    const controlRadius = innerRadius / Math.cos(qtrStep);

    this.moveTo(Math.cos(start) * outerRadius, Math.sin(start) * outerRadius);

    for (let n = 1; n <= points; ++n) {
      const tip = start + step * n;

      const inControl = tip - qtrStep * 3;
      const valley = tip - halfStep;
      this.quadraticCurveTo(
        Math.cos(inControl) * controlRadius,
        Math.sin(inControl) * controlRadius,
        Math.cos(valley) * innerRadius,
        Math.sin(valley) * innerRadius,
      );

      const outControl = tip - qtrStep;
      this.quadraticCurveTo(
        Math.cos(outControl) * controlRadius,
        Math.sin(outControl) * controlRadius,
        Math.cos(tip) * outerRadius,
        Math.sin(tip) * outerRadius,
      );
    }

    this.closePath();
  }
}
