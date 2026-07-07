import { BufferGeometry, CylinderGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface WineBottleGeometryOptions {
  /** Body radius. Defaults to `0.5`. */
  radius?: number;
  /** Neck radius. Defaults to `0.2`. */
  neckRadius?: number;
  /** Total height including neck. Defaults to `3`. */
  height?: number;
  /** Neck height. Defaults to `1`. */
  neckHeight?: number;
  /** Circumference segments. Defaults to `16`. */
  segments?: number;
}

/**
 * Wine bottle — cylindrical body, shoulder taper, and neck.
 *
 * Local frame: base at Y=0.
 */
export class WineBottleGeometry extends BufferGeometry {
  readonly radius: number;
  readonly height: number;

  constructor({
    radius = 0.5,
    neckRadius = 0.2,
    height = 3,
    neckHeight = 1,
    segments = 16,
  }: WineBottleGeometryOptions = {}) {
    super();

    this.radius = radius;
    this.height = height;

    const bodyHeight = height - neckHeight;
    const bodyGeometry = new CylinderGeometry(radius, radius, bodyHeight, segments);
    bodyGeometry.translate(0, bodyHeight / 2, 0);

    const shoulderHeight = 0.3;
    const shoulderGeometry = new CylinderGeometry(neckRadius, radius, shoulderHeight, segments);
    shoulderGeometry.translate(0, bodyHeight + shoulderHeight / 2, 0);

    const neckGeometry = new CylinderGeometry(neckRadius, neckRadius, neckHeight, segments);
    neckGeometry.translate(0, bodyHeight + shoulderHeight + neckHeight / 2, 0);

    this.copy(mergeGeometries([bodyGeometry, shoulderGeometry, neckGeometry], false) as BufferGeometry);
  }
}