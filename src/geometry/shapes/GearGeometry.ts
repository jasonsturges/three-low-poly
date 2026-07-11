import { ExtrudeGeometry } from "three";
import { GearShape, type GearShapeOptions } from "../../shapes/GearShape";

export interface GearGeometryOptions extends GearShapeOptions {
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded gear profile with center bore.
 */
export class GearGeometry extends ExtrudeGeometry {
  constructor({ depth = 0.25, ...shapeOptions }: GearGeometryOptions = {}) {
    super(new GearShape(shapeOptions), { depth, bevelEnabled: false });
  }
}
