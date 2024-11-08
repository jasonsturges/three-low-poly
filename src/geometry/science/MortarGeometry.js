import { BufferGeometry, CircleGeometry, LatheGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

class MortarGeometry extends BufferGeometry {
  constructor() {
    super();

    const mortarPoints = [
      new Vector2(1, 0), // Bottom of the bowl
      new Vector2(1.2, 0.5), // Slight flare at the base
      new Vector2(1.4, 1.5), // Outer wall
      new Vector2(1.3, 1.8), // Flared edge
      new Vector2(0.8, 1.8), // Lip of the bowl
    ];
    const mortarGeometry = new LatheGeometry(mortarPoints, 12);

    // Create a disk to close off the bottom
    const baseDisk = new CircleGeometry(1, 12); // Radius matches the base of the mortar
    baseDisk.rotateX(-Math.PI / 2); // Rotate to align with the bottom
    baseDisk.translate(0, 0, 0); // Position at the base of the mortar

    this.copy(mergeGeometries([mortarGeometry, baseDisk], false));
  }
}

export { MortarGeometry };
