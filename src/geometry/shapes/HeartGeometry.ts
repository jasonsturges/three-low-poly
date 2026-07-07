import { ExtrudeGeometry } from "three";
import { HeartShape } from "../../shapes/HeartShape";

export interface HeartGeometryOptions {
  /** Overall scale factor. Defaults to `1`. */
  size?: number;
  /** Heart width. Defaults to `2.1`. */
  width?: number;
  /** Heart height. Defaults to `1.4`. */
  height?: number;
  /** Tip depth. Defaults to `1.6`. */
  tipDepth?: number;
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded heart prism.
 */
export class HeartGeometry extends ExtrudeGeometry {
  constructor({
    size = 1,
    width = 2.1,
    height = 1.4,
    tipDepth = 1.6,
    depth = 0.25,
  }: HeartGeometryOptions = {}) {
    super(new HeartShape(size, width, height, tipDepth), { depth, bevelEnabled: false });
  }
}