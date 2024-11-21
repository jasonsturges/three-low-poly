import { Mesh, MeshStandardMaterial } from "three";
import { RockGeometry } from "../../geometry/rocks/RockGeometry";

export class Rock extends Mesh<RockGeometry, MeshStandardMaterial> {
  constructor(radius = 1, widthSegments = 4, heightSegments = 4) {
    super(
      new RockGeometry(radius, widthSegments, heightSegments),
      new MeshStandardMaterial({ color: 0x808080, flatShading: true }),
    );
  }
}
