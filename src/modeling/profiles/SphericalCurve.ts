import { Vector2 } from "three";
import { thetaLengthForRadius } from "../../utils/SphericalGeometryUtils";

/**
 * Sample a bottom-to-top ellipsoidal lathe profile centered at sphereStartY.
 * Hole radii truncate the ends; radii must fit within sphereRadiusX.
 *
 * ```
 *    const points: Vector2[] = [
 *       new Vector2(1, 0),
 *       ...appendSphericalCurve(
 *         2,  // Radius x
 *         2,  // Radius y
 *         5,  // Start y
 *         0,  // Hole top radius
 *         1,  // Hole bottom radius
 *         32, // Segments
 *       ),
 *     ];
 *
 *     const latheGeometry = new LatheGeometry(points, 32);
 * ```
 *
 * ```
 *    const points: Vector2[] = [
 *       ...appendSphericalCurve(
 *         2,  // Radius x
 *         2,  // Radius y
 *         1,  // Start y
 *         1,  // Hole top radius
 *         0,  // Hole bottom radius
 *         32, // Segments
 *       ),
 *       new Vector2(1, 5),
 *     ];
 *
 *     const latheGeometry = new LatheGeometry(points, 32);
 * ```
 */
export function appendSphericalCurve(
  sphereRadiusX: number,
  sphereRadiusY: number,
  sphereStartY: number,
  holeTopRadius: number = 0,
  holeBottomRadius: number = 0,
  segments: number = 32,
) {
  const thetaTop = holeTopRadius ? thetaLengthForRadius(sphereRadiusX, holeTopRadius) : 0;
  const thetaBottom = holeBottomRadius ? Math.PI - thetaLengthForRadius(sphereRadiusX, holeBottomRadius) : Math.PI;

  const spherePoints = [];
  for (let i = 0; i <= segments; i++) {
    const theta = thetaBottom - ((thetaBottom - thetaTop) / segments) * i;
    const x = sphereRadiusX * Math.sin(theta);
    const y = sphereRadiusY * Math.cos(theta) + sphereStartY;
    spherePoints.push(new Vector2(x, y));
  }

  return [...spherePoints];
}
