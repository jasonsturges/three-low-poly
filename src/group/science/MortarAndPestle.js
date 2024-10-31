import { CylinderGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial } from "three";
import { MortarGeometry } from "../../geometry/science/MortarGeometry.js";

class MortarAndPestle extends Group {
  constructor() {
    super();

    // Mortar geometry
    const mortarGeometry = new MortarGeometry();

    // Pestle geometry
    const pestleGeometry = new CylinderGeometry(0.2, 0.3, 1.5, 8);
    pestleGeometry.translate(0, 0.75, 0); // Offset to make the end rounded

    // Materials
    const mortarMaterial = new MeshStandardMaterial({
      color: 0x5c4033, // Dark earthy tone
      roughness: 1.0,
      metalness: 0.0,
      side: DoubleSide, // Render inside and outside
    });

    const pestleMaterial = new MeshStandardMaterial({
      color: 0x8b5a2b, // Slightly lighter earthy color
      roughness: 0.8,
      metalness: 0.1,
    });

    // Meshes
    const mortar = new Mesh(mortarGeometry, mortarMaterial);
    const pestle = new Mesh(pestleGeometry, pestleMaterial);

    // Position and rotate the pestle to rest in the mortar
    pestle.position.set(0.3, 1.3, 0);
    pestle.rotation.z = Math.PI / 4;

    // Group for easy manipulation
    this.add(mortar, pestle);
  }
}

export { MortarAndPestle };
