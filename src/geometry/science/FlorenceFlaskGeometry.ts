import { BufferGeometry, LatheGeometry, Vector2 } from "three";
import { thetaLengthForRadius } from "../../utils/SphericalGeometryUtils";

export class FlorenceFlaskGeometry extends BufferGeometry {
  constructor() {
    super();

    // Parameters
    const radius = 1; // Sphere radius
    const numPoints = 32; // Number of points to define the semicircle
    const numSegments = 32; // Number of segments for the lathe geometry
    const holRadius = 0.2;
    const thetaLength = thetaLengthForRadius(radius, holRadius);

    const points = [];

    // Tube
    points.push(new Vector2(0.2, 2.5));

    // Generate points for the semicircle
    for (let i = 0; i <= numPoints; i++) {
      const theta = thetaLength + ((Math.PI - thetaLength) / numPoints) * i; // Start at thetaLength
      const x = radius * Math.sin(theta); // x = r * sin(θ)
      const y = radius * Math.cos(theta); // y = r * cos(θ)
      points.push(new Vector2(x, y));
    }

    // Create LatheGeometry
    const latheGeometry = new LatheGeometry(points, numSegments);
    this.copy(latheGeometry);
  }
}
