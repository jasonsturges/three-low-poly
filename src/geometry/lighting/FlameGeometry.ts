import { ParametricGeometry } from "three-stdlib";
import { Vector3 } from "three";

export class FlameGeometry extends ParametricGeometry {
  constructor({ height = 0.25, radius = 0.05, segmentsU = 16, segmentsV = 16 } = {}) {
    super(
      (u: number, v: number, target: Vector3) => {
        const theta = u * Math.PI * 2;
        const radialFactor = Math.sin(v * Math.PI);
        const x = radius * radialFactor * Math.cos(theta);
        const y = v * height; // center: v * height - height / 2
        const z = radius * radialFactor * Math.sin(theta);

        target.set(x, y, -z);
      },
      segmentsU,
      segmentsV,
    );
  }
}
