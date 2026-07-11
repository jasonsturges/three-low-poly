import { Shape } from "three";

export interface HexagonShapeOptions {
  /** Circumradius — center to corner. Defaults to `1`. */
  radius?: number;
}

/**
 * Regular hexagon profile, first corner at +X.
 */
export class HexagonShape extends Shape {
  constructor({ radius = 1 }: HexagonShapeOptions = {}) {
    super();

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i; // 60-degree increments
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
    this.closePath();
  }
}
