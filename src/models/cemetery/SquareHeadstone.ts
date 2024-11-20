import { Mesh, MeshStandardMaterial } from "three";
import { SquareHeadstoneGeometry } from "../../geometry/cemetery/SquareHeadstoneGeometry";

export class SquareHeadstone extends Mesh<SquareHeadstoneGeometry, MeshStandardMaterial> {
  constructor(width = 0.5, height = 0.8, depth = 0.15) {
    super(
      new SquareHeadstoneGeometry(width, height, depth),
      new MeshStandardMaterial({ color: 0x777777, roughness: 0.8 })
    );
  }
}
