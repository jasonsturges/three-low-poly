import { BufferGeometry, SphereGeometry } from "three";
import { capHeightFromRadius, radiusFromCapWidth } from "../../utils/SphericalGeometryUtils";

export interface MoundGeometryOptions {
  /** Sphere radius. Defaults to a cap width of `5` at `thetaLength`. */
  radius?: number;
  /** Horizontal segments. Defaults to `64`. */
  widthSegments?: number;
  /** Vertical segments. Defaults to `32`. */
  heightSegments?: number;
  /** Azimuth start angle (radians). Defaults to `0`. */
  phiStart?: number;
  /** Azimuth sweep (radians). Defaults to `2π`. */
  phiLength?: number;
  /** Polar sweep from the north pole (radians). Defaults to `π/10`. */
  thetaLength?: number;
}

/**
 * Mound-like geometry with a flat top — sphere cap, base on Y=0.
 */
export class MoundGeometry extends BufferGeometry {
  readonly radius: number;
  readonly thetaLength: number;

  constructor({
    radius = radiusFromCapWidth(5, Math.PI / 10),
    widthSegments = 64,
    heightSegments = 32,
    phiStart = 0,
    phiLength = Math.PI * 2,
    thetaLength = Math.PI / 10,
  }: MoundGeometryOptions = {}) {
    super();

    this.radius = radius;
    this.thetaLength = thetaLength;

    this.copy(new SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, 0, thetaLength));

    const height = capHeightFromRadius(radius, thetaLength);
    this.translate(0, -radius + height, 0);
  }
}