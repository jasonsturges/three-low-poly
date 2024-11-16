import {
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from "three";

class TeslaCoil extends Group {
  constructor() {
    super();

    // Base geometry
    const coilBaseGeometry = new CylinderGeometry(0.5, 0.6, 0.3, 16);
    const coilBaseMaterial = new MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.6,
      metalness: 0.5,
    });
    const coilBase = new Mesh(coilBaseGeometry, coilBaseMaterial);
    coilBase.position.y = 0.15;

    // Coil geometry
    const coilGeometry = new CylinderGeometry(0.15, 0.15, 2, 12, 1, true);
    const coilMaterial = new MeshStandardMaterial({
      color: 0xff6600,
      roughness: 0.5,
      metalness: 0.8,
      side: DoubleSide,
    });
    const coil = new Mesh(coilGeometry, coilMaterial);
    coil.position.y = 1.3;

    // Sphere at the top
    const coilTopGeometry = new SphereGeometry(0.3, 16, 16);
    const coilTop = new Mesh(coilTopGeometry, coilMaterial);
    coilTop.position.y = 2.4;

    this.add(coilBase, coil, coilTop);
  }
}

export { TeslaCoil };
