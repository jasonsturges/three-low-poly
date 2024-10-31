import { BeakerGeometry } from "../../geometry/science/BeakerGeometry.js";
import { DoubleSide, Group, Mesh, MeshPhysicalMaterial } from "three";

class Beaker extends Group {
  constructor() {
    super();

    // Create the geometry
    const beakerGeometry = new BeakerGeometry();

    // Create a group to combine the geometries
    const glassMaterial = new MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
      reflectivity: 0.8,
      transmission: 0.9,
      side: DoubleSide,
    });

    const beaker = new Mesh(beakerGeometry, glassMaterial);
    beaker.rotation.x = -Math.PI / 2;
    this.add(beaker);
  }
}

export { Beaker };
