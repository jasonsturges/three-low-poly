import { ExtrudeGeometry } from "three";
import { BurstShape, type BurstShapeOptions } from "../../shapes/BurstShape";

export interface BurstGeometryOptions extends BurstShapeOptions {
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded burst / starburst prism.
 */
export class BurstGeometry extends ExtrudeGeometry {
  constructor({ depth = 0.25, ...shapeOptions }: BurstGeometryOptions = {}) {
    super(new BurstShape(shapeOptions), { depth, bevelEnabled: false });
  }
}
