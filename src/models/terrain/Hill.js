import { Mesh, MeshStandardMaterial } from "three";
import { HillGeometry } from "../../geometry/terrain/HillGeometry.js";

export class Hill extends Mesh {
  constructor({
    radius = 3, //
    height = 0.6,
    widthSegments = 64,
    heightSegments = 16,
    phiStart = 0,
    phiLength = Math.PI * 2,
  } = {}) {
    super();

    this.geometry = new HillGeometry({
      radius,
      height,
      widthSegments,
      heightSegments,
      phiStart,
      phiLength,
    });

    this.material = new MeshStandardMaterial({ color: 0x00ff00, flatShading: true });
  }
}
