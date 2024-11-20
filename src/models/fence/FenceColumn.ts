import { Mesh, MeshStandardMaterial } from "three";
import { FenceColumnGeometry } from "../../geometry/fence/FenceColumnGeometry";

export class FenceColumn extends Mesh<FenceColumnGeometry, MeshStandardMaterial> {
  constructor({ height = 2.25 } = {}) {
    super(
      new FenceColumnGeometry({ height }),
      new MeshStandardMaterial({ color: 0x8b7d7b, flatShading: true })
    );
  }
}
