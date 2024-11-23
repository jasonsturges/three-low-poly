import { BufferGeometry, CylinderGeometry } from "three";
import { FlameGeometry } from "./FlameGeometry";
import { mergeBufferGeometries } from "three-stdlib";

/**
 * Group indices
 * 0: Stick
 * 1: Flame
 */
export class CandleGeometry extends BufferGeometry {
  constructor({
    radiusTop = 0.2, //
    radiusBottom = 0.2,
    height = 1,
    flameHeight = 0.25,
    flameRadius = 0.05,
    segments = 16,
  } = {}) {
    super();
    const stickGeometry = new CylinderGeometry(radiusTop, radiusBottom, height, segments);
    stickGeometry.translate(0, height / 2 , 0);

    const flameGeometry = new FlameGeometry({
      segmentsU: segments,
      segmentsV: segments,
      height: flameHeight,
      radius: flameRadius,
    });
    flameGeometry.translate(0, height , 0);

    this.copy(mergeBufferGeometries([stickGeometry, flameGeometry], true) as BufferGeometry);
  }
}
