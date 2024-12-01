import { Mesh, MeshStandardMaterial } from "three";
import { HeartGeometry } from "../../geometry/shapes/HeartGeometry";

export class Heart extends Mesh {
  constructor({ size = 1, width = 2.1, height = 1.4, tipDepth = 1.6, depth = 0.25 } = {}) {
    super(
      new HeartGeometry(size, width, height, tipDepth, depth),
      new MeshStandardMaterial({
        color: 0xc62828,
        emissive: 0xc61416,
        emissiveIntensity: 0.25,
        metalness: 0.1,
        roughness: 0.3,
        flatShading: true,
      }),
    );
  }
}
