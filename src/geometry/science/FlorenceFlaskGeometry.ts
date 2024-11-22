import { BufferGeometry, LatheGeometry, Vector2 } from "three";
import { appendSphericalCurve } from "../../utils/SphericalCurve";

export class FlorenceFlaskGeometry extends BufferGeometry {
  constructor() {
    super();

    const points = [
      ...appendSphericalCurve(1, 1, 0.5, 0.2, 0, 32),
      new Vector2(0.2, 3),
    ];

    // Create LatheGeometry
    const latheGeometry = new LatheGeometry(points, 32);
    this.copy(latheGeometry);
  }
}
