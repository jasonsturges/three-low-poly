import { Mesh, MeshStandardMaterial } from "three";
import { ObeliskHeadstoneGeometry } from "../../geometry/cemetery/ObeliskHeadstoneGeometry.js";

export class ObeliskHeadstone extends Mesh {
  constructor(totalHeight = 1.75, baseWidth = 0.75) {
    super();

    this.geometry = new ObeliskHeadstoneGeometry(totalHeight, baseWidth);
    this.material = new MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });
  }
}
