import { Mesh, MeshStandardMaterial } from "three";
import { CrossHeadstoneGeometry } from "../../geometry/cemetery/CrossHeadstoneGeometry.js";

export class CrossHeadstone extends Mesh {
  constructor(width = 0.4, height = 1.2, depth = 0.2) {
    super();

    this.geometry = new CrossHeadstoneGeometry(width, height, depth);
    this.material = new MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });
  }
}
