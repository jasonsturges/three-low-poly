import { Mesh, MeshStandardMaterial } from "three";
import {
  RoundedHeadstoneGeometry,
  type RoundedHeadstoneGeometryOptions,
} from "../../geometry/cemetery/RoundedHeadstoneGeometry";

/**
 * A round-topped headstone. See {@link RoundedHeadstoneGeometry} — it is an arched slab, so it takes the
 * whole arch vocabulary, shoulders included.
 */
export class RoundedHeadstone extends Mesh<RoundedHeadstoneGeometry, MeshStandardMaterial> {
  constructor(options: RoundedHeadstoneGeometryOptions = {}) {
    super(
      new RoundedHeadstoneGeometry(options),
      new MeshStandardMaterial({ color: 0x777777, roughness: 0.8, flatShading: true }),
    );
  }
}
