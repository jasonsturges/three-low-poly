import { BufferAttribute, BufferGeometry } from "three";
import { pushSpiralRiser, pushSpiralTread } from "./staircaseQuad";

export interface SpiralStaircaseGeometryOptions {
  /** Newel / center-hole radius (inner edge of every tread). Defaults to `0.45`. */
  innerRadius?: number;
  /** Radial tread width (outer − inner radius). Defaults to `1.95`. */
  width?: number;
  /** Arc run per step at the walking line (mid-radius). Defaults to `0.45`. */
  treadDepth?: number;
  /** Vertical rise per step (riser). Defaults to `0.2`. */
  riserHeight?: number;
  /** Number of steps. Defaults to `20`. */
  stepCount?: number;
  /** Spiral start angle in radians (+X = 0, CCW). Defaults to `0`. */
  startAngle?: number;
  /** Override step angle (radians). When omitted, derived from `treadDepth`. */
  stepAngle?: number;
}

/**
 * Turret-style spiral staircase — trapezoidal treads between an inner newel radius
 * and an outer wall radius, ascending counter-clockwise when viewed from above.
 *
 * Each step is a four-sided tread (no pinched center point). Step angle is
 * derived from tread depth at the mid-radius so treads meet without overlapping.
 */
export class SpiralStaircaseGeometry extends BufferGeometry {
  readonly innerRadius: number;
  readonly width: number;
  readonly outerRadius: number;
  readonly treadDepth: number;
  readonly riserHeight: number;
  readonly stepCount: number;
  readonly startAngle: number;
  readonly stepAngle: number;
  readonly totalHeight: number;
  readonly totalTurn: number;

  constructor({
    innerRadius = 0.45,
    width = 1.95,
    treadDepth = 0.45,
    riserHeight = 0.2,
    stepCount = 20,
    startAngle = 0,
    stepAngle: stepAngleOption,
  }: SpiralStaircaseGeometryOptions = {}) {
    super();

    this.innerRadius = Math.max(0.01, innerRadius);
    this.width = Math.max(0.05, width);
    this.outerRadius = this.innerRadius + this.width;
    this.treadDepth = treadDepth;
    this.riserHeight = riserHeight;
    this.stepCount = Math.max(1, Math.round(stepCount));
    this.startAngle = startAngle;

    const walkRadius = (this.innerRadius + this.outerRadius) * 0.5;
    this.stepAngle =
      stepAngleOption ?? Math.max(treadDepth / walkRadius, Math.PI / 180);
    this.totalHeight = this.stepCount * this.riserHeight;
    this.totalTurn = this.stepCount * this.stepAngle;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const buffers = { positions, normals, uvs, indices };

    for (let i = 0; i < this.stepCount; i++) {
      const angleStart = this.startAngle + i * this.stepAngle;
      const angleEnd = angleStart + this.stepAngle;
      const yBottom = i * this.riserHeight;
      const yTop = yBottom + this.riserHeight;

      pushSpiralRiser(buffers, this.innerRadius, this.outerRadius, yBottom, yTop, angleStart);
      pushSpiralTread(buffers, this.innerRadius, this.outerRadius, yTop, angleStart, angleEnd);
    }

    this.setIndex(indices);
    this.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    this.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    this.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    this.computeBoundingSphere();
  }
}