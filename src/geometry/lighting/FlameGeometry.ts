import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js";
import { Vector3 } from "three";

export interface FlameGeometryOptions {
  /** Flame tip height. Defaults to `0.25`. */
  height?: number;
  /** Base radius at the widest point. Defaults to `0.05`. */
  radius?: number;
  /** Parametric segments around the circumference. Defaults to `16`. */
  segmentsU?: number;
  /** Parametric segments along the height. Defaults to `16`. */
  segmentsV?: number;
}

/**
 * Teardrop flame volume — parametric surface tapering to a point at the top.
 *
 * Local frame: base at Y=0, tip at Y=`height`.
 */
export class FlameGeometry extends ParametricGeometry {
  readonly height: number;
  readonly radius: number;
  readonly segmentsU: number;
  readonly segmentsV: number;

  constructor({
    height = 0.25,
    radius = 0.05,
    segmentsU = 16,
    segmentsV = 16,
  }: FlameGeometryOptions = {}) {
    super(
      (u: number, v: number, target: Vector3) => {
        const theta = u * Math.PI * 2;
        const radialFactor = Math.sin(v * Math.PI);
        const x = radius * radialFactor * Math.cos(theta);
        const y = v * height;
        const z = radius * radialFactor * Math.sin(theta);

        target.set(x, y, -z);
      },
      segmentsU,
      segmentsV,
    );

    this.height = height;
    this.radius = radius;
    this.segmentsU = segmentsU;
    this.segmentsV = segmentsV;
  }
}