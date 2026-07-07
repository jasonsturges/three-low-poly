import { BufferGeometry, DodecahedronGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface MossyRockGeometryOptions {
  /** Rock dodecahedron radius. Defaults to `1`. */
  radius?: number;
  /** Dodecahedron detail level. Defaults to `0`. */
  detail?: number;
  /** Moss horizontal scale relative to the rock. Defaults to `0.9`. */
  mossScaleXZ?: number;
  /** Moss vertical scale relative to the rock. Defaults to `0.5`. */
  mossScaleY?: number;
  /** Moss center offset above the rock origin. Defaults to `0.3`. */
  mossOffsetY?: number;
}

/**
 * Mossy rock — dodecahedron body with a smaller, flatter moss shell (group 1).
 *
 * Material groups: `0` rock, `1` moss.
 *
 * Local frame: centered on the rock body.
 */
export class MossyRockGeometry extends BufferGeometry {
  readonly radius: number;
  readonly detail: number;

  constructor({
    radius = 1,
    detail = 0,
    mossScaleXZ = 0.9,
    mossScaleY = 0.5,
    mossOffsetY = 0.3,
  }: MossyRockGeometryOptions = {}) {
    super();

    this.radius = radius;
    this.detail = detail;

    const rock = new DodecahedronGeometry(radius, detail);

    const moss = new DodecahedronGeometry(radius, detail);
    moss.scale(mossScaleXZ, mossScaleY, mossScaleXZ);
    moss.translate(0, mossOffsetY, 0);

    this.copy(mergeGeometries([rock, moss], true) as BufferGeometry);
    this.computeVertexNormals();
  }
}