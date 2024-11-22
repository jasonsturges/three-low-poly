import { BufferGeometry, CylinderGeometry, SphereGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

/**
 * Group indices
 * 0: Base
 * 1: Coil
 */
export class TeslaCoilGeometry extends BufferGeometry {
  constructor() {
    super();

    // Base geometry
    const baseGeometry = new CylinderGeometry(0.5, 0.6, 0.3, 16);
    baseGeometry.translate(0, 0.15, 0);

    // Coil geometry
    const coilGeometry = new CylinderGeometry(0.15, 0.15, 2, 12, 1, true);
    coilGeometry.translate(0, 1.3, 0);
    const coilTopGeometry = new SphereGeometry(0.3, 16, 16);
    coilTopGeometry.translate(0, 2.4, 0);

    this.copy(
      mergeBufferGeometries(
        [baseGeometry, mergeBufferGeometries([coilGeometry, coilTopGeometry]) as BufferGeometry],
        true,
      ) as BufferGeometry,
    );
  }
}
