import { ExtrudeGeometry } from "three";
import { StarShape, type StarShapeOptions } from "../../shapes/StarShape";

export interface StarGeometryOptions extends StarShapeOptions {
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded star prism.
 */
export class StarGeometry extends ExtrudeGeometry {
  constructor({ depth = 0.25, ...shapeOptions }: StarGeometryOptions = {}) {
    super(new StarShape(shapeOptions), { depth, bevelEnabled: false });
  }
}
