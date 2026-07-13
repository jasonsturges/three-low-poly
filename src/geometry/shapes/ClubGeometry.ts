import { ExtrudeGeometry } from "three";
import { ClubShape, type ClubShapeOptions } from "../../shapes/ClubShape";

export interface ClubGeometryOptions extends ClubShapeOptions {
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded club prism.
 */
export class ClubGeometry extends ExtrudeGeometry {
  constructor({ depth = 0.25, ...shapeOptions }: ClubGeometryOptions = {}) {
    super(new ClubShape(shapeOptions), { depth, bevelEnabled: false });
  }
}
