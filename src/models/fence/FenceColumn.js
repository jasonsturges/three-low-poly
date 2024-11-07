import { Mesh, MeshStandardMaterial } from "three";
import { FenceColumnGeometry } from "../../geometry/fence/FenceColumnGeometry.js";

export class FenceColumn extends Mesh {
  constructor({ height = 2.25 } = {}) {
    super();

    this.geometry = new FenceColumnGeometry({ height });
    this.material = new MeshStandardMaterial({ color: 0x8b7d7b, flatShading: true });
  }
}
