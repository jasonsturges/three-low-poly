import { BufferAttribute, BufferGeometry } from "three";
import { pushRiserZ, pushTreadZ } from "./staircaseQuad";

export interface StaircaseGeometryOptions {
  /** Stair width (tread left–right extent). Defaults to `2`. */
  width?: number;
  /** Vertical rise per step (riser). Defaults to `0.3`. */
  riserHeight?: number;
  /** Horizontal run per step (tread depth). Defaults to `0.5`. */
  treadDepth?: number;
  /** Number of steps. Defaults to `10`. */
  stepCount?: number;
}

/**
 * Straight run staircase — open risers and treads (no side stringers yet).
 *
 * Local frame: centered on width, rises along +Y, runs along +Z. Each step
 * emits a front riser (+Z) and a top tread (+Y). UVs are normalized per face
 * (0–1) so materials can tile per step.
 */
export class StaircaseGeometry extends BufferGeometry {
  readonly width: number;
  readonly riserHeight: number;
  readonly treadDepth: number;
  readonly stepCount: number;
  readonly totalHeight: number;
  readonly totalDepth: number;

  constructor({
    width = 2,
    riserHeight = 0.3,
    treadDepth = 0.5,
    stepCount = 10,
  }: StaircaseGeometryOptions = {}) {
    super();

    this.width = width;
    this.riserHeight = riserHeight;
    this.treadDepth = treadDepth;
    this.stepCount = Math.max(1, Math.round(stepCount));
    this.totalHeight = this.stepCount * this.riserHeight;
    this.totalDepth = this.stepCount * this.treadDepth;

    const hw = width / 2;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const buffers = { positions, normals, uvs, indices };

    for (let i = 0; i < this.stepCount; i++) {
      const yBottom = i * this.riserHeight;
      const yTop = yBottom + this.riserHeight;
      const zFront = i * this.treadDepth;
      const zBack = zFront + this.treadDepth;

      pushRiserZ(buffers, hw, yBottom, yTop, zFront);
      pushTreadZ(buffers, hw, yTop, zFront, zBack);
    }

    this.setIndex(indices);
    this.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    this.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    this.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    this.computeBoundingSphere();
  }
}