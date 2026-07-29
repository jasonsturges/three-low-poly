import { BoxGeometry } from "three";

export interface WeatheredPlankGeometryOptions {
  /** Long axis, authored along local X. */
  length?: number;
  width?: number;
  thickness?: number;
  seed?: number;
  /** Maximum edge wander as a fraction of width. */
  roughness?: number;
  /** Maximum broad bow as a fraction of thickness. */
  bow?: number;
  /** Maximum end skew as a fraction of width. */
  endSkew?: number;
}

function noise(seed: number, x: number, y: number, z: number): number {
  const value =
    Math.sin(seed * 0.0137 + x * 17.17 + y * 31.73 + z * 47.21) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

/**
 * A single rough-sawn board centered at the origin, with its long axis on X.
 * The geometry owns only the board's shape; gaps and installation variation
 * belong to whichever wall, floor, or roof assembly places it.
 */
export class WeatheredPlankGeometry extends BoxGeometry {
  constructor({
    length = 2,
    width = 0.28,
    thickness = 0.08,
    seed = 1,
    roughness = 0.055,
    bow = 0.12,
    endSkew = 0.08,
  }: WeatheredPlankGeometryOptions = {}) {
    super(length, width, thickness, 8, 2, 1);

    const position = this.attributes.position;
    const halfLength = length / 2;
    const halfWidth = width / 2;

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const nx = halfLength === 0 ? 0 : x / halfLength;
      const edge = halfWidth === 0 ? 0 : Math.abs(y / halfWidth);

      const edgeWander =
        noise(seed, x * 1.7, Math.sign(y), 0) * width * roughness * edge;
      const endWander =
        Math.abs(nx) > 0.98
          ? noise(seed + 19, 0, y * 8, z * 8) * width * endSkew
          : 0;
      const broadBow =
        (1 - nx * nx) * noise(seed + 31, 0, y, 0) * thickness * bow;
      const surface =
        noise(seed + 47, x * 4, y * 9, z * 13) * thickness * 0.035;

      position.setXYZ(
        i,
        x + Math.sign(x) * endWander,
        y + Math.sign(y || 1) * edgeWander,
        z + broadBow + surface,
      );
    }

    position.needsUpdate = true;
    this.computeVertexNormals();
  }
}
