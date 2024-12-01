import { ExtrudeGeometry } from "three";
import { GearShape } from "../../shapes/GearShape";

/**
 * Extrude geometry of Gear Shape.
 */
export class GearGeometry extends ExtrudeGeometry {
  constructor(sides = 5, innerRadius = 0.5, outerRadius = 1, holeSides = 5, holeRadius = 0.25, depth = 0.25) {
    const shape = new GearShape(sides, innerRadius, outerRadius, holeSides, holeRadius);

    super(shape, {
      depth: depth,
      bevelEnabled: false,
    });
  }
}
