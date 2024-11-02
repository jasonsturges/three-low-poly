import { Path, Shape } from "three";

class GearShape extends Shape {
  constructor(sides = 5, innerRadius = 0.5, outerRadius = 1, holeSides = 5, holeRadius = 0.25) {
    super();

    const step = (Math.PI * 2) / sides;
    const qtrStep = step / 4;

    this.moveTo(Math.cos(0) * outerRadius, -Math.sin(0) * outerRadius);

    for (let n = 1; n <= sides; ++n) {
      this.lineTo(Math.cos(step * n - qtrStep * 3) * innerRadius, -Math.sin(step * n - qtrStep * 3) * innerRadius);
      this.lineTo(Math.cos(step * n - qtrStep * 2) * innerRadius, -Math.sin(step * n - qtrStep * 2) * innerRadius);
      this.lineTo(Math.cos(step * n - qtrStep) * outerRadius, -Math.sin(step * n - qtrStep) * outerRadius);
      this.lineTo(Math.cos(step * n) * outerRadius, -Math.sin(step * n) * outerRadius);
    }
    this.closePath();

    // Create the hole in the gear, if specified
    if (holeRadius > 0 && holeSides > 2) {
      const hole = new Path();
      const holeStep = (Math.PI * 2) / holeSides;

      hole.moveTo(Math.cos(0) * holeRadius, -Math.sin(0) * holeRadius);
      for (let n = 1; n < holeSides; ++n) {
        hole.lineTo(Math.cos(holeStep * n) * holeRadius, -Math.sin(holeStep * n) * holeRadius);
      }
      hole.lineTo(Math.cos(0) * holeRadius, -Math.sin(0) * holeRadius);

      this.holes.push(hole);
    }
  }
}

export { GearShape };
