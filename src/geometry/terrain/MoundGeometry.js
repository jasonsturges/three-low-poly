import { BufferGeometry, SphereGeometry } from "three";
import {capHeightFromRadius, radiusFromCapWidth} from "../../utils/SphericalGeometryUtils.js";

/**
 * Mound-like geometry with a flat top.
 *
 * To create a radius based on a desired width:
 * ```
 * const moundGeometry = new MoundGeometry({
 *   radius: radiusFromCapWidth(5, Math.PI / 10),
 * }
 * ```
 *
 * To create a radius based on a desired height:
 * ```
 * const moundGeometry = new MoundGeometry({
 *  radius: radiusFromCapHeight(5, Math.PI / 10),
 * }
 * ```
 */
export class MoundGeometry extends BufferGeometry {
  constructor({
    radius = radiusFromCapWidth(5, Math.PI / 10), //
    widthSegments = 64,
    heightSegments = 32,
    phiStart = 0,
    phiLength = Math.PI * 2,
    thetaLength = Math.PI / 10,
  } = {}) {
    super();

    this.copy(new SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, 0, thetaLength));

    // Translate the geometry so the base is at the origin
    const height = capHeightFromRadius(radius, thetaLength);
    this.translate(0, -radius + height, 0);
  }
}
