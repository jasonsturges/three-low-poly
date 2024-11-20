import { Mesh, MeshStandardMaterial } from "three";
import { ObeliskHeadstoneGeometry } from "../../geometry/cemetery/ObeliskHeadstoneGeometry";

interface ObeliskHeadstoneOptions {
  baseWidth?: number;
  totalHeight?: number;
}

export class ObeliskHeadstone extends Mesh<ObeliskHeadstoneGeometry, MeshStandardMaterial> {
  constructor({ totalHeight = 1.75, baseWidth = 0.75 }: ObeliskHeadstoneOptions = {}) {
    super(
      new ObeliskHeadstoneGeometry(totalHeight, baseWidth),
      new MeshStandardMaterial({ color: 0x777777, roughness: 0.8 })
    );
  }
}
