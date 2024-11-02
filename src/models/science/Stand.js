import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, TorusGeometry } from "three";

class Stand extends Group {
  constructor() {
    super();

    // Ring geometry for holding the beaker
    const ringGeometry = new TorusGeometry(0.3, 0.03, 8, 16); // Small torus for the ring
    const ringMaterial = new MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.7,
      metalness: 0.3,
    });
    const ring = new Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; // Orient the ring horizontally
    ring.position.y = 0.4; // Position at a height

    // Supporting legs
    const legGeometry = new CylinderGeometry(0.02, 0.02, 0.4, 8);
    const legMaterial = new MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.8,
      metalness: 0.3,
    });

    // Create three legs spaced around the ring
    const legs = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2; // Divide 360° into three
      const leg = new Mesh(legGeometry, legMaterial);
      leg.position.set(Math.cos(angle) * 0.25, 0.2, Math.sin(angle) * 0.25); // Position leg around ring
      legs.push(leg);
    }

    // Group the ring and legs into a single stand object
    this.add(ring, ...legs);
  }
}

export { Stand };
