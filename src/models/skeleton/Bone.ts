import { Mesh, MeshStandardMaterial } from "three";
import { BoneGeometry } from "../../geometry/skeleton/BoneGeometry";

export class Bone extends Mesh<BoneGeometry, MeshStandardMaterial> {
  constructor() {
    super(new BoneGeometry(), new MeshStandardMaterial({ color: 0xffffff }));
  }
}
