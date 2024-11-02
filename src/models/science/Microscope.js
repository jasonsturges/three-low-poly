import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";

class Microscope extends Group {
  constructor() {
    super();

    // Base geometry
    const baseGeometry = new BoxGeometry(1, 0.2, 0.5);
    const baseMaterial = new MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.6,
      metalness: 0.3,
    });
    const base = new Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.1;

    // Arm geometry
    const armGeometry = new BoxGeometry(0.2, 1, 0.2);
    const arm = new Mesh(armGeometry, baseMaterial);
    arm.position.set(0, 0.6, -0.2);

    // Eyepiece geometry
    const eyepieceGeometry = new CylinderGeometry(0.1, 0.1, 0.4, 8);
    const eyepieceMaterial = new MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.6,
    });
    const eyepiece = new Mesh(eyepieceGeometry, eyepieceMaterial);
    eyepiece.position.set(0, 1.1, -0.35);
    eyepiece.rotation.x = -Math.PI / 4; // Angle the eyepiece for viewing

    // Stage geometry
    const stageGeometry = new BoxGeometry(0.6, 0.1, 0.6);
    const stageMaterial = new MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.8,
      metalness: 0.2,
    });
    const stage = new Mesh(stageGeometry, stageMaterial);
    stage.position.set(0, 0.6, 0);

    // Assemble microscope
    this.add(base, arm, eyepiece, stage);
  }
}

export { Microscope };
