import { CylinderGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from "three";

class Bottle extends Group {
  constructor() {
    super();

    // Potion bottle geometry
    const bottlePoints = [
      new Vector2(0, 0), // Bottom
      new Vector2(0.8, 0), // Base
      new Vector2(1, 1.5), // Rounded body
      new Vector2(0.5, 2.2), // Neck
      new Vector2(0.6, 2.5), // Mouth
    ];
    const bottleGeometry = new LatheGeometry(bottlePoints, 10); // Low-poly segments

    // Cork geometry
    const corkGeometry = new CylinderGeometry(0.3, 0.4, 0.2, 8);

    // Materials
    const glassMaterial = new MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.3,
    });

    const liquidMaterial = new MeshStandardMaterial({
      color: 0xff3366, // Vibrant potion color
      transparent: true,
      opacity: 0.6,
    });

    const corkMaterial = new MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 1.0,
    });

    // Meshes
    const bottle = new Mesh(bottleGeometry, glassMaterial);
    bottle.castShadow = true;

    const liquid = new Mesh(bottleGeometry, liquidMaterial);
    const cork = new Mesh(corkGeometry, corkMaterial);

    // Adjust liquid position to appear inside bottle
    liquid.scale.set(0.8, 0.8, 0.8);
    liquid.position.y = 0.1; // Position slightly lower to appear "inside"

    // Position cork at the bottle's mouth
    cork.position.y = 2.5;

    // Group all elements for easy manipulation
    const potionBottle = new Group();
    potionBottle.add(bottle, liquid, cork);
    this.add(potionBottle);
  }
}

export { Bottle };
