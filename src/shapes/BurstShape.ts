import { Shape } from "three";

export class BurstShape extends Shape {
  constructor(sides = 5, innerRadius = 0.5, outerRadius = 1.0) {
    super();

    const step = (Math.PI * 2) / sides;
    const halfStep = step / 2;
    const qtrStep = step / 4;

    this.moveTo(Math.cos(0) * outerRadius, -Math.sin(0) * outerRadius);

    for (let n = 1; n <= sides; ++n) {
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
