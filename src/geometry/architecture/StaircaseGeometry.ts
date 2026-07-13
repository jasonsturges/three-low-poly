import { BufferGeometry } from "three";
import { createGeometryBuffers, toBufferGeometry } from "../../utils/GeometryBuffers";
import { pushRiser, pushTread } from "./staircaseQuad";

export interface StaircaseGeometryOptions {
  /** Stair width (tread left–right extent). Defaults to `2`. */
  width?: number;
  /** Vertical rise per step (riser). Defaults to `0.3`. */
  riserHeight?: number;
  /** Horizontal run per step (tread depth). Defaults to `0.5`. */
  treadDepth?: number;
  /** Number of steps — counted as risers, the way a stair is actually measured. Defaults to `10`. */
  stepCount?: number;
  /**
   * Emit the tread at the very top. Defaults to `true`.
   *
   * Set `false` when the flight climbs to a landing or a floor, because that surface *is* the top
   * tread — the last riser lifts you onto it. Emitting one anyway leaves a tread lying coplanar with
   * the landing: you would climb the last riser, arrive on a step, and then walk *forward* rather
   * than up. It also silently deepens the landing by one tread.
   *
   * So a flight of 5 steps into a landing is 5 risers and 4 treads; the landing is the fifth.
   */
  topTread?: boolean;
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
  readonly topTread: boolean;
  readonly totalHeight: number;
  /** Run from the foot to the last surface — one tread shorter when a landing tops the flight. */
  readonly totalDepth: number;

  constructor({
    width = 2,
    riserHeight = 0.3,
    treadDepth = 0.5,
    stepCount = 10,
    topTread = true,
  }: StaircaseGeometryOptions = {}) {
    super();

    this.width = width;
    this.riserHeight = riserHeight;
    this.treadDepth = treadDepth;
    this.stepCount = Math.max(1, Math.round(stepCount));
    this.topTread = topTread;
    this.totalHeight = this.stepCount * this.riserHeight;
    // Without a top tread the run stops at the last riser — the landing takes it from there.
    this.totalDepth = (this.stepCount - (topTread ? 0 : 1)) * this.treadDepth;

    const hw = width / 2;
    const buffers = createGeometryBuffers();

    for (let i = 0; i < this.stepCount; i++) {
      const yBottom = i * this.riserHeight;
      const yTop = yBottom + this.riserHeight;
      const zFront = i * this.treadDepth;
      const zBack = zFront + this.treadDepth;

      pushRiser(buffers, hw, yBottom, yTop, zFront);

      // Every riser gets a tread to land on — except the last one, when a landing provides it.
      if (topTread || i < this.stepCount - 1) {
        pushTread(buffers, hw, yTop, zFront, zBack);
      }
    }

    this.copy(toBufferGeometry(buffers));
  }
}