import { Mesh, MeshStandardMaterial } from "three";
import { MoundGeometry } from "../../geometry/terrain/MoundGeometry";
import { radiusFromCapWidth } from "../../utils/SphericalGeometryUtils";

/**
 * Mound-like mesh with a flat top.
 *
 * To create a radius based on a desired width:
 * ```
 * const mound = new Mound({
 *   radius: radiusFromCapWidth(5, Math.PI / 10),
 * }
 * ```
 *
 * To create a radius based on a desired height:
 * ```
 * const mound = new Mound({
 *  radius: radiusFromCapHeight(5, Math.PI / 10),
 * }
 * ```
 */
export class Mound extends Mesh {
  constructor({
    radius = radiusFromCapWidth(5, Math.PI / 10), //
    widthSegments = 64,
    heightSegments = 32,
    phiStart = 0,
    phiLength = Math.PI * 2,
    thetaLength = Math.PI / 10,
  } = {}) {
    super();

    this.geometry = new MoundGeometry({
      radius,
      widthSegments,
      heightSegments,
      phiStart,
      phiLength,
      thetaLength,
    });

    this.material = new MeshStandardMaterial({ color: 0x00ff00, flatShading: true });
  }
}
