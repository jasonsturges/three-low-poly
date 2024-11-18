import { CylinderGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from "three";

class Flask extends Group {
  constructor() {
    super();

    // Flask body geometry
    const flaskPoints = [
      new Vector2(0, 0), // Bottom of the flask
      new Vector2(1.2, 0), // Base
      new Vector2(1.5, 1.5), // Mid-body
      new Vector2(1, 3), // Narrow neck
      new Vector2(0.6, 3.5), // Mouth of the flask
    ];
    const flaskGeometry = new LatheGeometry(flaskPoints, 12); // 12 segments for low-poly style

    // Cork stopper geometry
    const corkGeometry = new CylinderGeometry(0.6, 0.7, 0.3, 8); // Simple tapered cylinder

    // Materials for flask and cork
    const glassMaterial = new MeshStandardMaterial({
      color: 0x88ccaa,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.5,
      depthWrite: false,
    });

    const corkMaterial = new MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 1.0,
    });

    // Meshes
    const flask = new Mesh(flaskGeometry, glassMaterial);
    flask.castShadow = true;
    const cork = new Mesh(corkGeometry, corkMaterial);

    // Position cork on top of the flask
    cork.position.y = 3.5;

    // Add both to a single object for easy manipulation
    this.add(flask, cork);
  }
}

export { Flask };
