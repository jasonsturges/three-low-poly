import { Mesh, MeshStandardMaterial } from "three";
import { StoneFencePostGeometry } from "../../geometry/fence/StoneFencePostGeometry";

export class StoneFencePost extends Mesh<StoneFencePostGeometry, MeshStandardMaterial> {
  constructor({ height = 2.25 } = {}) {
    super(
      new StoneFencePostGeometry({ height }),
      new MeshStandardMaterial({ color: 0x8b7d7b, flatShading: true })
    );
  }
}
