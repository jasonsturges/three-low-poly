import { Vector3 } from "three";
import type { PathPoint } from "./PathPoint";

export interface SpiralPathOptions {
  /** Radius at the first point. */
  startRadius?: number;
  /** Number of turns. */
  turns?: number;
  /** Exponential decay coefficient; zero gives a circle. */
  tightness?: number;
  /** Number of spiral intervals. */
  segments?: number;
}

/** Logarithmic spiral r = r₀·e^(−kθ) in XY. Tangents carry derivative direction, with the positive r factor omitted. */
export function spiralPath({
  startRadius = 1,
  turns = 1.5,
  tightness = 0.22,
  segments = 96,
}: SpiralPathOptions = {}): PathPoint[] {
  const total = turns * Math.PI * 2;

  return Array.from({ length: segments + 1 }, (_, i) => {
    const theta = (i / segments) * total;
    const r = startRadius * Math.exp(-tightness * theta);

    return {
      position: new Vector3(r * Math.cos(theta), r * Math.sin(theta), 0),
      // r' = −k·r, so d/dθ of r·(cosθ, sinθ) is r·(−k·cosθ − sinθ, −k·sinθ + cosθ)
      tangent: new Vector3(
        -tightness * Math.cos(theta) - Math.sin(theta),
        -tightness * Math.sin(theta) + Math.cos(theta),
        0,
      ),
    };
  });
}
