import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { TeslaCoilGeometry } from "../../geometry/science/TeslaCoilGeometry";

/**
 * Material indices
 * 0: Base
 * 1: Coil
 */
export class TeslaCoil extends Mesh<TeslaCoilGeometry, MeshStandardMaterial[]> {
  constructor() {
    super(new TeslaCoilGeometry(), [
      new MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.6,
        metalness: 0.5,
      }),
      new MeshStandardMaterial({
        color: 0xff6600,
        roughness: 0.5,
        metalness: 0.8,
        side: DoubleSide,
      }),
    ]);
  }
}
