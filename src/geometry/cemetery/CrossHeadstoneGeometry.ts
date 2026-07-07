import { BoxGeometry, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface CrossHeadstoneGeometryOptions {
  /** Overall cross width (arm span). Defaults to `0.4`. */
  width?: number;
  /** Total height. Defaults to `1.2`. */
  height?: number;
  /** Slab depth. Defaults to `0.2`. */
  depth?: number;
}

/**
 * Cross headstone — vertical shaft and horizontal arm.
 *
 * Local frame: base on Y=0, centered on X/Z.
 */
export class CrossHeadstoneGeometry extends BufferGeometry {
  readonly width: number;
  readonly height: number;
  readonly depth: number;

  constructor({ width = 0.4, height = 1.2, depth = 0.2 }: CrossHeadstoneGeometryOptions = {}) {
    super();

    this.width = width;
    this.height = height;
    this.depth = depth;

    const verticalHeight = height * 0.6;
    const verticalGeometry = new BoxGeometry(width / 2, verticalHeight, depth);
    verticalGeometry.translate(0, verticalHeight / 2, 0);

    const horizontalWidth = width * 1.5;
    const horizontalGeometry = new BoxGeometry(horizontalWidth, width / 4, depth);
    horizontalGeometry.translate(0, verticalHeight * 0.75, 0);

    this.copy(mergeGeometries([verticalGeometry, horizontalGeometry], false) as BufferGeometry);
    this.computeVertexNormals();
  }
}