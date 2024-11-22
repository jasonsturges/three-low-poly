import { Mesh, MeshStandardMaterial } from "three";
import { MossyRocksGeometry } from "../../geometry/rocks/MossyRocksGeometry";

/**
 * Material indices:
 * 0. Rocks
 * 1. Moss
 */
export class MossyRocks extends Mesh<MossyRocksGeometry, MeshStandardMaterial[]> {
  constructor() {
    super(new MossyRocksGeometry(), [
      new MeshStandardMaterial({ color: 0x808080, flatShading: true }),
      new MeshStandardMaterial({ color: 0x4b8b3b, flatShading: true, opacity: 0.8, transparent: true }),
    ]);
  }
}
