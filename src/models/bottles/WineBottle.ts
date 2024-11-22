import { Mesh, MeshPhysicalMaterial } from "three";
import { WineBottleGeometry } from "../../geometry/bottles/WineBottleGeometry";

export class WineBottle extends Mesh<WineBottleGeometry, MeshPhysicalMaterial> {
  constructor() {
    super(
      new WineBottleGeometry(),
      new MeshPhysicalMaterial({
        color: 0x556b2f,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.2,
        metalness: 0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      }),
    );
  }
}
