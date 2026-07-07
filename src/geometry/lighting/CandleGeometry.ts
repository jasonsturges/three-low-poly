import { BufferGeometry, CylinderGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { FlameGeometry } from "./FlameGeometry";

export interface CandleGeometryOptions {
  /** Stick top radius. Defaults to `0.2`. */
  radiusTop?: number;
  /** Stick bottom radius. Defaults to `0.2`. */
  radiusBottom?: number;
  /** Stick height. Defaults to `1`. */
  height?: number;
  /** Flame tip height. Defaults to `0.25`. */
  flameHeight?: number;
  /** Flame base radius. Defaults to `0.05`. */
  flameRadius?: number;
  /** Circumference segments. Defaults to `16`. */
  segments?: number;
}

/**
 * Candle stick and flame — group 0 stick, group 1 flame.
 *
 * Local frame: base at Y=0.
 */
export class CandleGeometry extends BufferGeometry {
  readonly radiusTop: number;
  readonly radiusBottom: number;
  readonly height: number;
  readonly flameHeight: number;
  readonly flameRadius: number;
  readonly segments: number;

  constructor({
    radiusTop = 0.2,
    radiusBottom = 0.2,
    height = 1,
    flameHeight = 0.25,
    flameRadius = 0.05,
    segments = 16,
  }: CandleGeometryOptions = {}) {
    super();

    this.radiusTop = radiusTop;
    this.radiusBottom = radiusBottom;
    this.height = height;
    this.flameHeight = flameHeight;
    this.flameRadius = flameRadius;
    this.segments = segments;

    const stickGeometry = new CylinderGeometry(radiusTop, radiusBottom, height, segments);
    stickGeometry.translate(0, height / 2, 0);

    const flameGeometry = new FlameGeometry({
      segmentsU: segments,
      segmentsV: segments,
      height: flameHeight,
      radius: flameRadius,
    });
    flameGeometry.translate(0, height, 0);

    this.copy(mergeGeometries([stickGeometry, flameGeometry], true) as BufferGeometry);
  }
}