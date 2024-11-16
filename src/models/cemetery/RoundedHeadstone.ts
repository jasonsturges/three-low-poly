import { Mesh, MeshStandardMaterial } from "three";
import { RoundedHeadstoneGeometry } from "../../geometry/cemetery/RoundedHeadstoneGeometry";

export class RoundedHeadstone extends Mesh {
  constructor(width = 0.6, height = 1.0, depth = 0.2, radius = 0.6) {
    super();

    this.geometry = new RoundedHeadstoneGeometry(width, height, depth, radius);
    this.material = new MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });
  }
}
