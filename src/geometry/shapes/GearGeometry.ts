import { ExtrudeGeometry } from "three";
import { GearShape } from "../../shapes/GearShape";

export interface GearGeometryOptions {
  /** Number of gear teeth. Defaults to `5`. */
  sides?: number;
  /** Inner tooth valley radius. Defaults to `0.5`. */
  innerRadius?: number;
  /** Outer tooth tip radius. Defaults to `1`. */
  outerRadius?: number;
  /** Center hole sides. Defaults to `5`. */
  holeSides?: number;
  /** Center hole radius. Defaults to `0.25`. */
  holeRadius?: number;
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded gear profile with center hole.
 */
export class GearGeometry extends ExtrudeGeometry {
  constructor({
    sides = 5,
    innerRadius = 0.5,
    outerRadius = 1,
    holeSides = 5,
    holeRadius = 0.25,
    depth = 0.25,
  }: GearGeometryOptions = {}) {
    super(new GearShape(sides, innerRadius, outerRadius, holeSides, holeRadius), {
      depth,
      bevelEnabled: false,
    });
  }
}