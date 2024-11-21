import { Mesh, MeshStandardMaterial } from "three";
import { HillGeometry } from "../../geometry/terrain/HillGeometry";

export class Hill extends Mesh<HillGeometry, MeshStandardMaterial> {
  constructor({
    radius = 3, //
    height = 0.6,
    widthSegments = 64,
    heightSegments = 16,
    phiStart = 0,
    phiLength = Math.PI * 2,
  } = {}) {
    super(
      new HillGeometry({
        radius,
        height,
        widthSegments,
        heightSegments,
        phiStart,
        phiLength,
      }),
      new MeshStandardMaterial({ color: 0x00ff00, flatShading: true }),
    );
  }
}
