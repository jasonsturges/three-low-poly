import { ExtrudeGeometry } from "three";
import { HeartShape } from "../../shapes/HeartShape";

/**
 * Extrude geometry of Heart Shape.
 */
export class HeartGeometry extends ExtrudeGeometry {
  constructor(size = 1, width = 2.1, height = 1.4, tipDepth = 1.6, depth = 0.25) {
    const shape = new HeartShape(size, width, height, tipDepth);

    super(shape, {
      depth: depth,
      bevelEnabled: false,
    });
  }
}
