import { ExtrudeGeometry } from "three";
import { DiamondShape, type DiamondShapeOptions } from "../../shapes/DiamondShape";

export interface DiamondGeometryOptions extends DiamondShapeOptions {
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
  /** Curve resolution of the concave sides — the low-poly knob. Defaults to `16`. */
  curveSegments?: number;
}

/**
 * Extruded diamond prism — the card suit. See {@link DiamondShape}.
 */
export class DiamondGeometry extends ExtrudeGeometry {
  constructor({ depth = 0.25, curveSegments = 16, ...shapeOptions }: DiamondGeometryOptions = {}) {
    super(new DiamondShape(shapeOptions), { depth, bevelEnabled: false, curveSegments });
  }
}
