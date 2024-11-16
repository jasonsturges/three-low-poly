import { DodecahedronGeometry, Group, Mesh, MeshStandardMaterial } from "three";

class MossyRocks extends Group {
  constructor() {
    super();

    // Rock Geometry (using Dodecahedron for a low-poly random rock-like shape)
    const rockGeometry = new DodecahedronGeometry(1, 0); // Low-poly shape
    const rockMaterial = new MeshStandardMaterial({ color: 0x808080, flatShading: true });
    const mossMaterial = new MeshStandardMaterial({ color: 0x4b8b3b, flatShading: true, opacity: 0.8, transparent: true });

    // Create multiple random rocks with slight variations
    for (let i = 0; i < 5; i++) {
      const rockMesh = new Mesh(rockGeometry, rockMaterial);
      rockMesh.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4); // Scale randomly to make each rock unique
      rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI); // Random rotation for variation
      rockMesh.position.set((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4); // Keep rocks at ground level
      this.add(rockMesh);

      // Moss Layer (using a slightly smaller scale and positioned on top of the rock)
      const mossMesh = new Mesh(rockGeometry, mossMaterial);
      mossMesh.scale.set(rockMesh.scale.x * 0.9, rockMesh.scale.y * 0.5, rockMesh.scale.z * 0.9); // Make the moss layer flatter
      mossMesh.rotation.copy(rockMesh.rotation);
      mossMesh.position.copy(rockMesh.position);
      mossMesh.position.y += 0.3; // Raise the moss slightly to sit on top of the rock
      this.add(mossMesh);
    }
  }
}

export { MossyRocks };
