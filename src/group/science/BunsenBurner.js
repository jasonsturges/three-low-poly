import { ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";

class BunsenBurner extends Group {
  constructor() {
    super();

    // Base geometry
    const baseGeometry = new CylinderGeometry(0.3, 0.4, 0.1, 16);
    const baseMaterial = new MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.6,
      metalness: 0.3,
    });
    const base = new Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.05;

    // Burner tube geometry
    const tubeGeometry = new CylinderGeometry(0.1, 0.1, 0.7, 16);
    const tubeMaterial = new MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5,
      metalness: 0.4,
    });
    const tube = new Mesh(tubeGeometry, tubeMaterial);
    tube.position.y = 0.4;

    // Flame geometry
    const flameGeometry = new ConeGeometry(0.075, 0.2, 16);
    const flameMaterial = new MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff5500,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.8,
    });
    const flame = new Mesh(flameGeometry, flameMaterial);
    flame.position.y = 0.8;

    this.add(base, tube, flame);
  }
}

export { BunsenBurner };
