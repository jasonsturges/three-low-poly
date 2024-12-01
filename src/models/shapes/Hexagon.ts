import { Mesh, MeshStandardMaterial } from "three";
import { HexagonGeometry } from "../../geometry/shapes/HexagonGeometry";

export class Hexagon extends Mesh {
  constructor({ radius = 1, depth = 0.01 } = {}) {
    super(
      new HexagonGeometry(radius, depth),
      new MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.1,
        metalness: 0.1,
        roughness: 0.3,
        flatShading: true,
      }),
    );
  }
}
