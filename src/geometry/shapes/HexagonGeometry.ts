import { ExtrudeGeometry } from "three";
import { HexagonShape } from "../../shapes/HexagonShape";

export interface HexagonGeometryOptions {
  /** Hex circumradius. Defaults to `1`. */
  radius?: number;
  /** Extrusion depth. Defaults to `0.01`. */
  depth?: number;
}

/**
 * Extruded regular hexagon prism.
 */
export class HexagonGeometry extends ExtrudeGeometry {
  readonly radius: number;
  readonly depth: number;

  constructor({ radius = 1, depth = 0.01 }: HexagonGeometryOptions = {}) {
    super(new HexagonShape(radius), { depth, bevelEnabled: false });

    this.radius = radius;
    this.depth = depth;
  }
}