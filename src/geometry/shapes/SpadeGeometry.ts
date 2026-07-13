import { ExtrudeGeometry } from "three";
import { SpadeShape, type SpadeShapeOptions } from "../../shapes/SpadeShape";

export interface SpadeGeometryOptions extends SpadeShapeOptions {
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded spade prism.
 */
export class SpadeGeometry extends ExtrudeGeometry {
  constructor({ depth = 0.25, ...shapeOptions }: SpadeGeometryOptions = {}) {
    super(new SpadeShape(shapeOptions), { depth, bevelEnabled: false });
  }
}
