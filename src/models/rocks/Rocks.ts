import { Mesh, MeshStandardMaterial } from "three";
import { RocksGeometry } from "../../geometry/rocks/RocksGeometry";

export class Rocks extends Mesh<RocksGeometry, MeshStandardMaterial> {
  constructor() {
    super(new RocksGeometry(), new MeshStandardMaterial({ color: 0x808080, flatShading: true }));
  }
}
