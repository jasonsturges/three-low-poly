import { Curve, Vector3 } from "three";
import type { PathPoint } from "./PathPoint";

/**
 * Sample any Three.js `Curve` — `CatmullRomCurve3`, a Bézier, a `CurvePath`, or one of your own.
 *
 * The curve ANSWERS for its tangent (`getTangentAt`), which is the entire point: you never estimate it
 * from the chords. Sampled by arc length, so the stations come out evenly spaced rather than bunching
 * where the parameter happens to run slowly.
 *
 * @example
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
