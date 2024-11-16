import { Mesh, MeshStandardMaterial, Material } from "three";
import { CrossHeadstoneGeometry } from "../../geometry/cemetery/CrossHeadstoneGeometry";

interface CrossHeadstoneOptions {
  width?: number;
  height?: number;
  depth?: number;
  material?: Material;
}

export class CrossHeadstone extends Mesh {
  constructor({
    width = 0.4,
    height = 1.2,
    depth = 0.2,
    material = new MeshStandardMaterial({ color: 0x777777, roughness: 0.8 }),
  }: CrossHeadstoneOptions = {}) {
    const geometry = new CrossHeadstoneGeometry(width, height, depth);
    super(geometry, material);
  }
}
