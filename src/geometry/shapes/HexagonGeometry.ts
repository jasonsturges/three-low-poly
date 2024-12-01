import { ExtrudeGeometry } from "three";
import { HexagonShape } from "../../shapes/HexagonShape";

/**
 * Extrude geometry of Hexagon Shape.
 */
export class HexagonGeometry extends ExtrudeGeometry {
  constructor(radius = 1, depth = 0.01) {
    const shape = new HexagonShape(radius);

    super(shape, {
      depth: depth,
      bevelEnabled: false,
    });
  }
}
