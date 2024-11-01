import { Mesh, MeshPhysicalMaterial } from "three";
import { WineBottleGeometry } from "../../geometry/science/WineBottleGeometry.js";

class WineBottle extends Mesh {
  constructor() {
    super();

    // Create wine bottle geometry
    const wineBottle = new WineBottleGeometry();

    // Create a glass-like material
    const bottleMaterial = new MeshPhysicalMaterial({
      color: 0x556b2f,
      roughness: 0.1,
      transmission: 0.9, // Makes the material transparent
      thickness: 0.2,
      metalness: 0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    // Create mesh and add to the scene
    this.geometry = wineBottle;
    this.material = bottleMaterial;
  }
}

export { WineBottle };
