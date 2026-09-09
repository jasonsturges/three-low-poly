import { Curve, Vector3 } from "three";
import type { PathPoint } from "./PathPoint";

/**
 * Sample a Three Curve by arc length using getPointAt/getTangentAt, including both endpoints.
 * Tangent accuracy follows the supplied Curve implementation.
 *
 * ```ts
 * const curve = new CatmullRomCurve3(points, false, "centripetal");
 * const path = curvePath(curve, 64);
 * ```
 */
export function curvePath(curve: Curve<Vector3>, segments = 64): PathPoint[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;

    return {
      position: curve.getPointAt(t),
      tangent: curve.getTangentAt(t),
    };
  });
}
