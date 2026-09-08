import { Vector2 } from "three";

/**
 * Normalizes a time value `t` between a minimum and maximum value.
 * @param t - The value to normalize.
 * @param min - The minimum value of the range.
 * @param max - The maximum value of the range.
 * @returns A normalized value between 0 and 1.
 */
function normalizeT(t: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (t - min) / (max - min)));
}

/**
 * Generates an array of interpolated 2D points using an easing function.
 * @param curveFunction - The easing function to apply to the normalized value.
 * @param startRadius - The starting radius for interpolation.
 * @param endRadius - The ending radius for interpolation.
 * @param startHeight - The starting height for interpolation.
 * @param endHeight - The ending height for interpolation.
 * @param segments - The number of segments for interpolation (default is 20).
 * @param min - The minimum value of the normalization range (default is 0).
 * @param max - The maximum value of the normalization range (default is 1).
 * @returns An array of `Vector2` points representing the interpolated curve.
 */
export function interpolateCurve(
  curveFunction: (t: number) => number,
  startRadius: number,
  endRadius: number,
  startHeight: number,
  endHeight: number,
  segments: number = 20,
  min: number = 0,
  max: number = 1
): Vector2[] {
  const points: Vector2[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // Normalized value between 0 and 1
    const easedT = curveFunction(normalizeT(t, min, max));
    const x = startRadius + easedT * (endRadius - startRadius);
    const y = startHeight + t * (endHeight - startHeight);
    points.push(new Vector2(x, y));
  }

  return points;
}
