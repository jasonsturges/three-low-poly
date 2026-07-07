import { BufferGeometry, ConeGeometry, CylinderGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

export interface WroughtIronBarGeometryOptions {
  /** Vertical bar height. Defaults to `2`. */
  barHeight?: number;
  /** Bar cylinder radius. Defaults to `0.05`. */
  barRadius?: number;
  /** Spike cone height. Defaults to `0.3`. */
  spikeHeight?: number;
  /** Spike base radius. Defaults to `0.075`. */
  spikeRadius?: number;
  /** Spike depth scale on Z. Defaults to `1`. */
  spikeScaleZ?: number;
  /** Circumference segments. Defaults to `8`. */
  radialSegments?: number;
}

/**
 * Wrought-iron fence post — cylinder bar with a decorative spike.
 *
 * Local frame: base at Y=0.
 */
export class WroughtIronBarGeometry extends BufferGeometry {
  readonly barHeight: number;

  constructor({
    barHeight = 2.0,
    barRadius = 0.05,
    spikeHeight = 0.3,
    spikeRadius = 0.075,
    spikeScaleZ = 1.0,
    radialSegments = 8,
  }: WroughtIronBarGeometryOptions = {}) {
    super();

    this.barHeight = barHeight;

    const barGeometry = new CylinderGeometry(barRadius, barRadius, barHeight, radialSegments);
    barGeometry.translate(0, barHeight / 2, 0);

    const spikeGeometry = new ConeGeometry(spikeRadius, spikeHeight, radialSegments);
    spikeGeometry.translate(0, barHeight + spikeHeight / 2, 0);
    spikeGeometry.scale(1, 1, spikeScaleZ);

    this.copy(mergeBufferGeometries([barGeometry, spikeGeometry], false) as BufferGeometry);
  }
}