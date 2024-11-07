import { Mesh, MeshStandardMaterial } from "three";
import { BoneGeometry } from "../../geometry/skeleton/BoneGeometry.js";

export class Bone extends Mesh {
  constructor() {
    super();

    this.geometry = new BoneGeometry();
    this.material = new MeshStandardMaterial({ color: 0xffffff });
  }
}
