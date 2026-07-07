import { BufferGeometry, LatheGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface ErlenmeyerFlaskGeometryOptions {
  /** Flask body radius. Defaults to `1`. */
  flaskRadius?: number;
  /** Neck radius. Defaults to `0.3`. */
  neckRadius?: number;
  /** Body height before the neck. Defaults to `2.5`. */
  height?: number;
  /** Neck height. Defaults to `1`. */
  neckHeight?: number;
  /** Lathe segments. Defaults to `16`. */
  radialSegments?: number;
}

/**
 * Erlenmeyer flask profile — conical body with straight neck and lip.
 *
 * Local frame: base at Y=0.
 */
export class ErlenmeyerFlaskGeometry extends BufferGeometry {
  readonly flaskRadius: number;
  readonly height: number;

  constructor({
    flaskRadius = 1,
    neckRadius = 0.3,
    height = 2.5,
    neckHeight = 1,
    radialSegments = 16,
  }: ErlenmeyerFlaskGeometryOptions = {}) {
    super();

    this.flaskRadius = flaskRadius;
    this.height = height;

    const points = [
      new Vector2(0, 0),
      new Vector2(flaskRadius * 0.875, 0),
      new Vector2(flaskRadius, 0.1),
      new Vector2(neckRadius, height),
      new Vector2(neckRadius, height + neckHeight),
      new Vector2(neckRadius * 1.1, height + neckHeight + 0.3),
    ];

    const flaskGeometry = new LatheGeometry(points, radialSegments);

    this.copy(mergeGeometries([flaskGeometry], false) as BufferGeometry);
  }
}