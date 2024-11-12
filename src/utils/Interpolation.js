import { Vector2 } from "three";

/**
 * Normalizes a time value between a minimum and maximum value.
 */
function normalizeT(t, min, max) {
  return Math.max(0, Math.min(1, (t - min) / (max - min)));
}

/**
 * Generates an array of interpolated 2D points using an easing function.
 */
export function interpolateCurve(curveFunction, startRadius, endRadius, startHeight, endHeight, segments = 20, min = 0, max = 1) {
  const points = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // Normalized value between 0 and 1
    const easedT = curveFunction(normalizeT(t, min, max));
    const x = startRadius + easedT * (endRadius - startRadius);
    const y = startHeight + t * (endHeight - startHeight);
    points.push(new Vector2(x, y));
  }
  return points;
}
