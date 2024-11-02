import { Shape } from "three";

class StarShape extends Shape {
  constructor(points, innerRadius, outerRadius) {
    super();

    const step = (Math.PI * 2) / points;
    const halfStep = step / 2;
    this.moveTo(Math.cos(0) * outerRadius, Math.sin(0) * outerRadius);

    for (let n = 1; n <= points; ++n) {
      this.lineTo(Math.cos(step * n - halfStep) * innerRadius, Math.sin(step * n - halfStep) * innerRadius);
      this.lineTo(Math.cos(step * n) * outerRadius, Math.sin(step * n) * outerRadius);
    }

    this.closePath();
  }
}

export { StarShape };
