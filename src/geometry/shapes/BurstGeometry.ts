import { ExtrudeGeometry } from "three";
import { BurstShape } from "../../shapes/BurstShape";

/**
 * Extrude geometry of Burst Shape.
 */
export class BurstGeometry extends ExtrudeGeometry {
  constructor(sides = 5, innerRadius = 0.5, outerRadius = 1.0, depth = 0.25) {
    const shape = new BurstShape(sides, innerRadius, outerRadius);

    super(shape, {
      depth: depth,
      bevelEnabled: false,
    });
  }
}
