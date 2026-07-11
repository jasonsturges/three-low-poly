import { ExtrudeGeometry } from "three";
import { HexagonShape, type HexagonShapeOptions } from "../../shapes/HexagonShape";

export interface HexagonGeometryOptions extends HexagonShapeOptions {
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
    super(new HexagonShape({ radius }), { depth, bevelEnabled: false });

    this.radius = radius;
    this.depth = depth;
  }
}
