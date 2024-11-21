import { FlorenceFlaskGeometry } from "../../geometry/science/FlorenceFlaskGeometry";
import { DoubleSide, Mesh, MeshPhysicalMaterial } from "three";

export class FlorenceFlask extends Mesh<FlorenceFlaskGeometry, MeshPhysicalMaterial> {
  constructor() {
    super(
      new FlorenceFlaskGeometry(),
      new MeshPhysicalMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.1,
        reflectivity: 0.8,
        transmission: 0.9,
        side: DoubleSide,
      }),
    );
  }
}
