import { BufferGeometry, SphereGeometry } from "three";

export interface HillGeometryOptions {
  /** Base sphere radius before vertical squash. Defaults to `3`. */
  radius?: number;
  /** Peak height. Defaults to `0.6`. */
  height?: number;
  /** Horizontal segments. Defaults to `64`. */
  widthSegments?: number;
  /** Vertical segments. Defaults to `16`. */
  heightSegments?: number;
  /** Azimuth start angle (radians). Defaults to `0`. */
  phiStart?: number;
  /** Azimuth sweep (radians). Defaults to `2π`. */
  phiLength?: number;
}

/**
 * Hemispherical hill — a sphere cap scaled on Y, base on the Y=0 plane.
 */
export class HillGeometry extends BufferGeometry {
  readonly radius: number;
  readonly height: number;

  constructor({
    radius = 3,
    height = 0.6,
    widthSegments = 64,
    heightSegments = 16,
    phiStart = 0,
    phiLength = Math.PI * 2,
  }: HillGeometryOptions = {}) {
    super();

    this.radius = radius;
    this.height = height;

    this.copy(new SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, 0, Math.PI / 2));
    this.scale(1, height / radius, 1);
  }
}