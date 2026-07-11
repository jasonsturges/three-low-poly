import { Shape } from "three";

export interface BurstShapeOptions {
  /** Number of burst points. Defaults to `5`. */
  points?: number;
  /** Inner vertex radius. Defaults to `0.5`. */
  innerRadius?: number;
  /** Outer vertex radius. Defaults to `1`. */
  outerRadius?: number;
}

/**
 * Starburst profile — radial points joined by concave quadratic curves.
 */
export class BurstShape extends Shape {
  constructor({ points = 5, innerRadius = 0.5, outerRadius = 1.0 }: BurstShapeOptions = {}) {
    super();

    const step = (Math.PI * 2) / points;
    const halfStep = step / 2;
    const qtrStep = step / 4;

    this.moveTo(Math.cos(0) * outerRadius, -Math.sin(0) * outerRadius);

    for (let n = 1; n <= points; ++n) {
      let cx = Math.cos(step * n - qtrStep * 3) * (innerRadius / Math.cos(qtrStep));
      let cy = -Math.sin(step * n - qtrStep * 3) * (innerRadius / Math.cos(qtrStep));
      let dx = Math.cos(step * n - halfStep) * innerRadius;
      let dy = -Math.sin(step * n - halfStep) * innerRadius;
      this.quadraticCurveTo(cx, cy, dx, dy);
      cx = Math.cos(step * n - qtrStep) * (innerRadius / Math.cos(qtrStep));
      cy = -Math.sin(step * n - qtrStep) * (innerRadius / Math.cos(qtrStep));
      dx = Math.cos(step * n) * outerRadius;
      dy = -Math.sin(step * n) * outerRadius;
      this.quadraticCurveTo(cx, cy, dx, dy);
    }

    this.closePath();
  }
}
