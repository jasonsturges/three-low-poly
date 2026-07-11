import { Shape } from "three";

export interface PolygonShapeOptions {
  /** Number of sides. Defaults to `6`. */
  sides?: number;
  /** Circumradius — center to corner. Defaults to `1`. */
  radius?: number;
  /** Rotation in radians from the resting state. Defaults to `0`. */
  rotation?: number;
}

/**
 * Regular n-gon profile.
 *
 * Rests with a corner pointing up. Rotate by `Math.PI / sides` for a flat top.
 */
export class PolygonShape extends Shape {
  constructor({ sides = 6, radius = 1, rotation = 0 }: PolygonShapeOptions = {}) {
    super();

    const step = (Math.PI * 2) / sides;
    const start = Math.PI / 2 + rotation;

    for (let i = 0; i < sides; i++) {
      const angle = start + step * i;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }

    this.closePath();
  }
}
