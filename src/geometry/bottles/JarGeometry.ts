import { BufferGeometry, CylinderGeometry, LatheGeometry, Vector2 } from "three";
import { mergeBufferGeometries } from "three-stdlib";

/**
 * Group indices
 * 0. Jar
 * 1. Cork
 */
export class JarGeometry extends BufferGeometry {
  constructor() {
    super();

    // Jar
    const points = [
      new Vector2(0, 0),     // Bottom of the jar
      new Vector2(1.2, 0),   // Base
      new Vector2(1.5, 1.5), // Mid-body
      new Vector2(1, 3),     // Narrow neck
      new Vector2(0.6, 3.5), // Mouth of the jar
      new Vector2(0.5, 3.5), // Cork
    ];

    const bodyGeometry = new LatheGeometry(points, 10);

    // Cork
    const corkGeometry = new CylinderGeometry(0.6, 0.5, 0.3, 10);
    corkGeometry.translate(0, 3.5, 0);

    this.copy(mergeBufferGeometries([bodyGeometry, corkGeometry], true) as BufferGeometry);
  }
}
