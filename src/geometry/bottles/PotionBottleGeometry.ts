import { BufferGeometry, CylinderGeometry, LatheGeometry, Vector2 } from "three";
import { calculateXFromSlopeIntercept } from "../../utils/LineEquations";
import { mergeBufferGeometries } from "three-stdlib";

/**
 * Potion bottle geometry
 *
 * Group indices
 * 0. Bottle
 * 1. Cork
 * 2. Liquid (optional)
 */
export class PotionBottleGeometry extends BufferGeometry {
  constructor() {
    super();

    // Bottle
    const points = [
      new Vector2(0, 0),     // Origin
      new Vector2(0.8, 0),   // Base
      new Vector2(1, 1.5),   // Rounded body
      new Vector2(0.5, 2.2), // Neck
      new Vector2(0.6, 2.5), // Mouth
      new Vector2(0.5, 2.5), // Cork
    ];

    const bottleGeometry = new LatheGeometry(points, 10);

    // Cork
    const corkGeometry = new CylinderGeometry(0.55, 0.45, 0.2, 10);
    corkGeometry.translate(0, 2.5, 0);

    // Liquid (optional)
    const liquidPoints = [
      new Vector2(0, 0),
      new Vector2(0.8, 0),
      new Vector2(calculateXFromSlopeIntercept(0.8, 0, 1, 1.5, 1.0), 1.0),
      new Vector2(0, 1.0),
    ];

    const liquidGeometry = new LatheGeometry(liquidPoints, 10);
    liquidGeometry.translate(0, 0.1, 0);
    liquidGeometry.scale(0.9, 0.9, 0.9);

    this.copy(mergeBufferGeometries([bottleGeometry, corkGeometry, liquidGeometry], true) as BufferGeometry);
  }
}
