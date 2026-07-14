import { Mesh, MeshStandardMaterial } from "three";
import { MausoleumGeometry } from "../../geometry/cemetery/MausoleumGeometry";

/**
 * A mausoleum with a hollow interior and an arched doorway — see {@link MausoleumGeometry}.
 *
 * The doorway is empty. Hang doors in it by asking the geometry where they go:
 * `mausoleum.geometry.doorway`.
 *
 * Material indices:
 * 0. Base
 * 1. Building — walls and pillars
 * 2. Roof
 * 3. Interior — the floor and ceiling inside, darker, because nothing in there sees the sun
 */
export class Mausoleum extends Mesh<MausoleumGeometry, MeshStandardMaterial[]> {
  constructor() {
    super(
      new MausoleumGeometry(),
      [
        new MeshStandardMaterial({ color: 0x808080, flatShading: true }), // Base
        new MeshStandardMaterial({ color: 0x696969, flatShading: true }), // Building
        new MeshStandardMaterial({ color: 0x505050, flatShading: true }), // Roof
        new MeshStandardMaterial({ color: 0x2e2e2e, flatShading: true, roughness: 1 }), // Interior
      ],
    );
  }
}
