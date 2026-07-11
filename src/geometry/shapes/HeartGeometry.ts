import { ExtrudeGeometry } from "three";
import { HeartShape, type HeartShapeOptions } from "../../shapes/HeartShape";

export interface HeartGeometryOptions extends HeartShapeOptions {
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded heart prism.
 */
export class HeartGeometry extends ExtrudeGeometry {
  constructor({ depth = 0.25, ...shapeOptions }: HeartGeometryOptions = {}) {
    super(new HeartShape(shapeOptions), { depth, bevelEnabled: false });
  }
}
