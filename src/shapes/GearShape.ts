import { Path, Shape } from "three";

export interface GearShapeOptions {
  /** Number of gear teeth. Defaults to `5`. */
  teeth?: number;
  /** Tooth valley radius. Defaults to `0.5`. */
  innerRadius?: number;
  /** Tooth tip radius. Defaults to `1`. */
  outerRadius?: number;
  /** Number of sides on the center bore. Defaults to `5`. */
  holeSides?: number;
  /** Center bore radius. Set to `0` to omit the bore. Defaults to `0.25`. */
  holeRadius?: number;
}

/**
 * Gear profile — trapezoidal teeth around a polygonal center bore.
 */
export class GearShape extends Shape {
  constructor({
    teeth = 5,
    innerRadius = 0.5,
    outerRadius = 1,
    holeSides = 5,
    holeRadius = 0.25,
  }: GearShapeOptions = {}) {
    super();

    const step = (Math.PI * 2) / teeth;
    const qtrStep = step / 4;

    this.moveTo(Math.cos(0) * outerRadius, -Math.sin(0) * outerRadius);

    for (let n = 1; n <= teeth; ++n) {
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
