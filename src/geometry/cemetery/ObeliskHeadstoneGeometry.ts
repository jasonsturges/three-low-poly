import { BoxGeometry, BufferGeometry, ConeGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface ObeliskHeadstoneGeometryOptions {
  /** Total monument height. Defaults to `1.75`. */
  totalHeight?: number;
  /** Base platform width. Defaults to `0.75`. */
  baseWidth?: number;
}

/**
 * Tiered obelisk headstone with pyramid cap.
 *
 * Local frame: base on Y=0, centered on X/Z.
 */
export class ObeliskHeadstoneGeometry extends BufferGeometry {
  readonly totalHeight: number;
  readonly baseWidth: number;

  constructor({ totalHeight = 1.75, baseWidth = 0.75 }: ObeliskHeadstoneGeometryOptions = {}) {
    super();

    this.totalHeight = totalHeight;
    this.baseWidth = baseWidth;

    const baseHeight = totalHeight * 0.05;
    const lowerSegmentHeight = totalHeight * 0.15;
    const middleSegmentHeight = totalHeight * 0.15;
    const topSegmentHeight = totalHeight * 0.75;

    let currentHeight = 0;

    const baseGeometry = new BoxGeometry(baseWidth, baseHeight, baseWidth);
    baseGeometry.translate(0, currentHeight + baseHeight / 2, 0);
    currentHeight += baseHeight;

    const lowerSegmentGeometry = new BoxGeometry(baseWidth * 0.8, lowerSegmentHeight, baseWidth * 0.8);
    lowerSegmentGeometry.translate(0, currentHeight + lowerSegmentHeight / 2, 0);
    currentHeight += lowerSegmentHeight;

    const middleSegmentGeometry = new BoxGeometry(baseWidth * 0.6, middleSegmentHeight, baseWidth * 0.6);
    middleSegmentGeometry.translate(0, currentHeight + middleSegmentHeight / 2, 0);
    currentHeight += middleSegmentHeight;

    const topSegmentGeometry = new BoxGeometry(baseWidth * 0.4, topSegmentHeight, baseWidth * 0.4);
    topSegmentGeometry.translate(0, currentHeight + topSegmentHeight / 2, 0);
    currentHeight += topSegmentHeight;

    const pyramidGeometry = new ConeGeometry((baseWidth * 0.4) / Math.sqrt(2), 0.1, 4, 1, false, Math.PI / 4);
    pyramidGeometry.translate(0, currentHeight + 0.1 / 2, 0);

    this.copy(
      mergeGeometries(
        [baseGeometry, lowerSegmentGeometry, middleSegmentGeometry, topSegmentGeometry, pyramidGeometry],
        false,
      ) as BufferGeometry,
    );
    this.computeVertexNormals();
  }
}