import { DodecahedronGeometry, Group, Mesh, MeshStandardMaterial } from "three";

class Rocks extends Group {
  constructor() {
    super();

    // Rock Geometry (using Dodecahedron for a low-poly random rock-like shape)
    const rockGeometry = new DodecahedronGeometry(1, 0); // Low-poly shape
    const rockMaterial = new MeshStandardMaterial({ color: 0x808080, flatShading: true });

    // Create multiple random rocks with slight variations
    for (let i = 0; i < 5; i++) {
      const rockMesh = new Mesh(rockGeometry, rockMaterial);
      rockMesh.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4); // Scale randomly to make each rock unique
      rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI); // Random rotation for variation
      rockMesh.position.set((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4); // Keep rocks at ground level
      this.add(rockMesh);
    }
  }
}

export { Rocks };
