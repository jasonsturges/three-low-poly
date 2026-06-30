import { BufferAttribute, BufferGeometry } from "three";
import {
  pushLanding,
  pushRiserX,
  pushRiserZ,
  pushTreadX,
  pushTreadZ,
} from "./staircaseQuad";

export interface LShapedStaircaseGeometryOptions {
  /** Stair width (tread left–right extent). Defaults to `2`. */
  width?: number;
  /** Vertical rise per step (riser). Defaults to `0.3`. */
  riserHeight?: number;
  /** Horizontal run per step (tread depth). Defaults to `0.5`. */
  treadDepth?: number;
  /** Steps in each flight (before and after the landing). Defaults to `5`. */
  stepsPerFlight?: number;
}

/**
 * L-shaped staircase with a square landing (width × width) at the 90° turn.
 *
 * Local frame:
 * - First flight climbs +Z, centered on X = 0.
 * - Landing is a width² platform starting at the last tread (no cantilever over
 *   the lower flight) and extending forward at the turn.
 * - Second flight climbs −X from the left edge of the landing.
 */
export class LShapedStaircaseGeometry extends BufferGeometry {
  readonly width: number;
  readonly riserHeight: number;
  readonly treadDepth: number;
  readonly stepsPerFlight: number;
  readonly landingSize: number;
  readonly flightRun: number;
  readonly totalHeight: number;

  constructor({
    width = 2,
    riserHeight = 0.3,
    treadDepth = 0.5,
    stepsPerFlight = 5,
  }: LShapedStaircaseGeometryOptions = {}) {
    super();

    this.width = width;
    this.riserHeight = riserHeight;
    this.treadDepth = treadDepth;
    this.stepsPerFlight = Math.max(1, Math.round(stepsPerFlight));
    this.landingSize = width;
    this.flightRun = this.stepsPerFlight * this.treadDepth;
    this.totalHeight = this.stepsPerFlight * 2 * this.riserHeight;

    const hw = width / 2;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const buffers = { positions, normals, uvs, indices };

    for (let i = 0; i < this.stepsPerFlight; i++) {
      const yBottom = i * this.riserHeight;
      const yTop = yBottom + this.riserHeight;
      const zFront = i * this.treadDepth;
      const zBack = zFront + this.treadDepth;

      pushRiserZ(buffers, hw, yBottom, yTop, zFront);
      pushTreadZ(buffers, hw, yTop, zFront, zBack);
    }

    const landingY = this.stepsPerFlight * this.riserHeight;
    // Begin at the front of the last tread — avoids a shelf over the lower flight.
    const landingZNear = (this.stepsPerFlight - 1) * this.treadDepth;
    const landingZFar = landingZNear + this.landingSize;

    pushLanding(buffers, hw, landingY, landingZNear, landingZFar);

    const leftEdgeX = -hw;
    for (let i = 0; i < this.stepsPerFlight; i++) {
      const yBottom = landingY + i * this.riserHeight;
      const yTop = yBottom + this.riserHeight;
      const xFront = leftEdgeX - i * this.treadDepth;
      const xBack = xFront - this.treadDepth;

      pushRiserX(buffers, yBottom, yTop, xFront, landingZNear, landingZFar);
      pushTreadX(buffers, yTop, xFront, xBack, landingZNear, landingZFar);
    }

    this.setIndex(indices);
    this.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    this.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    this.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    this.computeBoundingSphere();
  }
}