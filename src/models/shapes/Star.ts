import { Mesh, MeshStandardMaterial } from "three";
import { StarGeometry } from "../../geometry/shapes/StarGeometry";

export class Star extends Mesh {
  constructor({ points = 5, innerRadius = 0.5, outerRadius = 1.0, depth = 0.25 } = {}) {
    super(
      new StarGeometry(points, innerRadius, outerRadius, depth),
      new MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffd700,
        emissiveIntensity: 0.25,
        metalness: 0.1,
        roughness: 0.3,
        flatShading: true,
      }),
    );
  }
}
