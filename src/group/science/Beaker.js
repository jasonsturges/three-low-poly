import { CylinderGeometry, DoubleSide, Group, Mesh, MeshPhysicalMaterial, SphereGeometry } from "three";

class Beaker extends Group {
  constructor() {
    super();

    // Create the sphere part of the glassware
    const sphereGeometry = new SphereGeometry(1, 16, 16);
    const tubeGeometry = new CylinderGeometry(0.2, 0.2, 2, 16, 1, true);

    // Adjust tube position to stick out of the sphere
    tubeGeometry.translate(0, 1.5, 0);
    tubeGeometry.rotateX(Math.PI / 2);

    // Create a group to combine the geometries
    const glassMaterial = new MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
      reflectivity: 0.8,
      transmission: 0.9, // For realistic glass effect
      side: DoubleSide,
    });

    const sphere = new Mesh(sphereGeometry, glassMaterial);
    const tube = new Mesh(tubeGeometry, glassMaterial);

    this.add(sphere);
    this.add(tube);
    this.rotateX(-Math.PI / 2);
  }
}

export { Beaker };
