import { ExtrudeGeometry } from "three";
import { PolygonShape, type PolygonShapeOptions } from "../../shapes/PolygonShape";

export interface PolygonGeometryOptions extends PolygonShapeOptions {
  /** Extrusion depth. Defaults to `0.01`. */
  depth?: number;
}

/**
 * Extruded regular n-gon prism.
 */
export class PolygonGeometry extends ExtrudeGeometry {
  readonly sides: number;
  readonly radius: number;
  readonly depth: number;

  constructor({ sides = 6, radius = 1, depth = 0.01, ...shapeOptions }: PolygonGeometryOptions = {}) {
    super(new PolygonShape({ sides, radius, ...shapeOptions }), { depth, bevelEnabled: false });

    this.sides = sides;
    this.radius = radius;
    this.depth = depth;
  }
}
