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
  /** The bore radius actually used, after clamping to fit inside the tooth profile. */
  readonly holeRadius: number;

  constructor({ depth = 0.25, ...shapeOptions }: GearGeometryOptions = {}) {
    const shape = new GearShape(shapeOptions);

    super(shape, { depth, bevelEnabled: false });

    this.holeRadius = shape.holeRadius;
  }
}
