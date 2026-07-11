import { Shape } from "three";

export interface StarShapeOptions {
  /** Number of star points. Defaults to `5`. */
  points?: number;
  /** Inner vertex radius. Defaults to `0.5`. */
  innerRadius?: number;
  /** Outer vertex radius. Defaults to `1`. */
  outerRadius?: number;
  /** Rotation in radians from the resting state. Defaults to `0`. */
  rotation?: number;
}

/**
 * Star profile — radial points joined by straight edges.
 *
 * Rests with a point up.
 */
export class StarShape extends Shape {
  constructor({ points = 5, innerRadius = 0.5, outerRadius = 1.0, rotation = 0 }: StarShapeOptions = {}) {
    super();

    const step = (Math.PI * 2) / points;
    const halfStep = step / 2;
    const start = Math.PI / 2 + rotation;

    this.moveTo(Math.cos(start) * outerRadius, Math.sin(start) * outerRadius);

    for (let n = 1; n <= points; ++n) {
      const valley = start + step * n - halfStep;
      const tip = start + step * n;
      this.lineTo(Math.cos(valley) * innerRadius, Math.sin(valley) * innerRadius);
      this.lineTo(Math.cos(tip) * outerRadius, Math.sin(tip) * outerRadius);
    }

    this.closePath();
  }
}
