import { BoxGeometry, BufferGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { WroughtIronBarGeometry } from "./WroughtIronBarGeometry";

export interface WroughtIronFenceGeometryOptions {
  /** Number of posts. Defaults to `20`. */
  count?: number;
  /** Center-to-center post spacing. Defaults to `0.4`. */
  spacing?: number;
  /** Post bar height. Defaults to `2`. */
  barHeight?: number;
  /** Post bar radius. Defaults to `0.05`. */
  barRadius?: number;
  /** Post spike height. Defaults to `0.3`. */
  spikeHeight?: number;
  /** Post spike radius. Defaults to `0.075`. */
  spikeRadius?: number;
  /** Post spike Z scale. Defaults to `1`. */
  spikeScaleZ?: number;
  /** Horizontal rail thickness. Defaults to `0.1`. */
  railHeight?: number;
  /** Horizontal rail depth. Defaults to `0.05`. */
  railDepth?: number;
  /** Top rail offset below the spike tip. Defaults to `0`. */
  railOffset?: number;
  /** Post circumference segments. Defaults to `8`. */
  radialSegments?: number;
}

/**
 * Wrought-iron fence run — repeated posts with top and bottom rails.
 *
 * Local frame: first post at the origin, extending along +X.
 */
export class WroughtIronFenceGeometry extends BufferGeometry {
  readonly count: number;
  readonly spacing: number;

  constructor({
    count = 20,
    spacing = 0.4,
    barHeight = 2.0,
    barRadius = 0.05,
    spikeHeight = 0.3,
    spikeRadius = 0.075,
    spikeScaleZ = 1.0,
    railHeight = 0.1,
    railDepth = 0.05,
    railOffset = 0.0,
    radialSegments = 8,
  }: WroughtIronFenceGeometryOptions = {}) {
    super();

    this.count = count;
    this.spacing = spacing;

    const geometries = [];
    const bar = new WroughtIronBarGeometry({
      barHeight,
      barRadius,
      spikeHeight,
      spikeRadius,
      spikeScaleZ,
      radialSegments,
    });
    const rail = new BoxGeometry(count * spacing, railHeight, railDepth);

    for (let i = 0; i < count; i++) {
      const geometry = bar.clone();
      geometry.translate(i * spacing, 0, 0);
      geometries.push(geometry);
    }

    const topRail = rail.clone();
    topRail.translate((spacing * (count - 1)) / 2, barHeight - railOffset - railHeight / 2, 0);
    geometries.push(topRail);

    const bottomRail = rail.clone();
    bottomRail.translate((spacing * (count - 1)) / 2, railHeight / 2, 0);
    geometries.push(bottomRail);

    this.copy(mergeBufferGeometries(geometries) as BufferGeometry);
  }
}