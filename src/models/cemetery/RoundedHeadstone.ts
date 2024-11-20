import { Mesh, MeshStandardMaterial } from "three";
import { RoundedHeadstoneGeometry } from "../../geometry/cemetery/RoundedHeadstoneGeometry";

export class RoundedHeadstone extends Mesh<RoundedHeadstoneGeometry, MeshStandardMaterial> {
  constructor(width = 0.6, height = 1.0, depth = 0.2, radius = 0.6) {
    super(
      new RoundedHeadstoneGeometry(width, height, depth, radius),
      new MeshStandardMaterial({ color: 0x777777, roughness: 0.8 })
    );
  }
}
