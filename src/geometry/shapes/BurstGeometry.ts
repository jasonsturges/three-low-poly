import { ExtrudeGeometry } from "three";
import { BurstShape } from "../../shapes/BurstShape";

export interface BurstGeometryOptions {
  /** Number of burst rays. Defaults to `5`. */
  sides?: number;
  /** Inner vertex radius. Defaults to `0.5`. */
  innerRadius?: number;
  /** Outer vertex radius. Defaults to `1`. */
  outerRadius?: number;
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded burst / starburst prism.
 */
export class BurstGeometry extends ExtrudeGeometry {
  constructor({
    sides = 5,
    innerRadius = 0.5,
    outerRadius = 1.0,
    depth = 0.25,
  }: BurstGeometryOptions = {}) {
    super(new BurstShape(sides, innerRadius, outerRadius), { depth, bevelEnabled: false });
  }
}