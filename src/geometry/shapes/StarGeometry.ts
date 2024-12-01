import { ExtrudeGeometry } from "three";
import { StarShape } from "../../shapes/StarShape";

/**
 * Extrude geometry of Star Shape.
 */
export class StarGeometry extends ExtrudeGeometry {
  constructor(points = 5, innerRadius = 0.5, outerRadius = 1.0, depth: number = 0.25) {
    const shape = new StarShape(points, innerRadius, outerRadius);

    super(shape, {
      depth: depth,
      bevelEnabled: false,
    });
  }
}
