import { CylinderGeometry, DoubleSide, Group, Mesh, MeshPhysicalMaterial, SphereGeometry } from "three";

class TestTube extends Group {
  constructor() {
    super();

    // Test Tube Geometry
    // Create the cylindrical body
    const tubeGeometry = new CylinderGeometry(0.2, 0.2, 3, 32, 1, true); // Radius top, radius bottom, height
    const tubeMaterial = new MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
      reflectivity: 0.8,
      transmission: 0.9, // For glass effect
      side: DoubleSide,
    });
    const tube = new Mesh(tubeGeometry, tubeMaterial);

    // Create the rounded bottom using a sphere
    const bottomGeometry = new SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); // Half sphere
    const bottom = new Mesh(bottomGeometry, tubeMaterial);

    // Position the bottom half-sphere at the base of the tube
    bottom.position.y = -1.5; // Position it at the bottom of the cylinder

    this.add(tube);
    this.add(bottom);
  }
}

export { TestTube };
