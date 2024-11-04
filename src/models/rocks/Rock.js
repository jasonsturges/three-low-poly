import { Mesh, MeshStandardMaterial } from "three";
import { RockGeometry } from "../../geometry/rocks/RockGeometry.js";

export class Rock extends Mesh {
  constructor(radius = 1, widthSegments = 4, heightSegments = 4) {
    super();

    // Create a rock geometry
    this.geometry = new RockGeometry(radius, widthSegments, heightSegments);
    this.material = new MeshStandardMaterial({ color: 0x808080, flatShading: true });
  }
}
