import { ExtrudeGeometry } from "three";
import { ArchedSlabShape, type ArchedSlabShapeOptions } from "../../shapes/ArchedSlabShape";

export interface ArchedSlabGeometryOptions extends ArchedSlabShapeOptions {
  /** Extrusion depth. Defaults to `0.18`. */
  depth?: number;
  /**
   * Segments in the arc — the low-poly knob. Defaults to `16`.
   *
   * `3` gives a chiselled, faceted arch; `24` a smooth cast one. Same outline, chosen resolution.
   */
  curveSegments?: number;
}

/**
 * Extruded arched slab — a door, an arched window, or a shouldered headstone, depending on the arch's
 * span. See {@link ArchedSlabShape}.
 *
 * @example
 * ```ts
 * const door      = new ArchedSlabGeometry({ width: 1.2, height: 1.4, archHeight: 0.6 });
 * const headstone = new ArchedSlabGeometry({ width: 1.2, height: 1.1, archWidth: 0.7 });
 * ```
 */
export class ArchedSlabGeometry extends ExtrudeGeometry {
  constructor({ depth = 0.18, curveSegments = 16, ...shapeOptions }: ArchedSlabGeometryOptions = {}) {
    super(new ArchedSlabShape(shapeOptions), { depth, bevelEnabled: false, curveSegments });
  }
}
