import { Mesh, MeshStandardMaterial } from "three";
import { SquareHeadstoneGeometry } from "../../geometry/cemetery/SquareHeadstoneGeometry";

export class SquareHeadstone extends Mesh {
  constructor(width = 0.5, height = 0.8, depth = 0.15) {
    super();

    this.geometry = new SquareHeadstoneGeometry(width, height, depth);
    this.material = new MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });
  }
}
