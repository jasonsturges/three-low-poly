import { ExtrudeGeometry } from "three";
import { StarShape } from "../../shapes/StarShape";

export interface StarGeometryOptions {
  /** Number of star points. Defaults to `5`. */
  points?: number;
  /** Inner vertex radius. Defaults to `0.5`. */
  innerRadius?: number;
  /** Outer vertex radius. Defaults to `1`. */
  outerRadius?: number;
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded star prism.
 */
export class StarGeometry extends ExtrudeGeometry {
  constructor({
    points = 5,
    innerRadius = 0.5,
    outerRadius = 1.0,
    depth = 0.25,
  }: StarGeometryOptions = {}) {
    super(new StarShape(points, innerRadius, outerRadius), { depth, bevelEnabled: false });
  }
}