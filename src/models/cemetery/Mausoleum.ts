import { Mesh, MeshStandardMaterial } from "three";
import { MausoleumGeometry } from "../../geometry/cemetery/MausoleumGeometry";

/**
 * Material indices:
 * 0. Base
 * 1. Building
 * 2. Roof
 * 3. Arched entrance
 */
export class Mausoleum extends Mesh<MausoleumGeometry, MeshStandardMaterial[]> {
  constructor() {
    super(
      new MausoleumGeometry(),
      [
        new MeshStandardMaterial({ color: 0x808080, flatShading: true }), // Base
        new MeshStandardMaterial({ color: 0x696969, flatShading: true }), // Building
        new MeshStandardMaterial({ color: 0x505050, flatShading: true }), // Roof
        new MeshStandardMaterial({ color: 0x404040, flatShading: true }), // Arched entrance
      ],
    );
  }
}
