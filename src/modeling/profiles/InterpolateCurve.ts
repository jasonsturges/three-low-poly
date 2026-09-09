import { Vector2 } from "three";

/** Clamp (t - min) / (max - min) to [0, 1]; min and max must differ. */
function normalizeT(t: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (t - min) / (max - min)));
}

/**
 * Sample Vector2(radius, height): radius follows curveFunction over the clamped min/max interval;
 * height interpolates linearly. segments must be positive.
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
    const t = i / segments;
    const easedT = curveFunction(normalizeT(t, min, max));
    const x = startRadius + easedT * (endRadius - startRadius);
    const y = startHeight + t * (endHeight - startHeight);
    points.push(new Vector2(x, y));
  }

  return points;
}
