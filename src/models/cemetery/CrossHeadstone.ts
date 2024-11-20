import { Mesh, MeshStandardMaterial } from "three";
import { CrossHeadstoneGeometry } from "../../geometry/cemetery/CrossHeadstoneGeometry";

interface CrossHeadstoneOptions {
  width?: number;
  height?: number;
  depth?: number;
}

export class CrossHeadstone extends Mesh<CrossHeadstoneGeometry, MeshStandardMaterial> {
  constructor({
    width = 0.4,
    height = 1.2,
    depth = 0.2,
  }: CrossHeadstoneOptions = {}) {
    super(
      new CrossHeadstoneGeometry(width, height, depth),
      new MeshStandardMaterial({ color: 0x777777, roughness: 0.8 })
    );
  }
}
