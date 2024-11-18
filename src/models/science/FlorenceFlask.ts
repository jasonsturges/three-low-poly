import { FlorenceFlaskGeometry } from "../../geometry/science/FlorenceFlaskGeometry";
import { DoubleSide, Mesh, MeshPhysicalMaterial } from "three";

export class FlorenceFlask extends Mesh {
  public geometry: FlorenceFlaskGeometry;
  public material: MeshPhysicalMaterial;

  constructor() {
    super();

    // Create the geometry
    this.geometry = new FlorenceFlaskGeometry();

    // Create a group to combine the geometries
    this.material = new MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
      reflectivity: 0.8,
      transmission: 0.9,
      side: DoubleSide,
    });

    this.rotation.x = -Math.PI / 2;
  }
}
