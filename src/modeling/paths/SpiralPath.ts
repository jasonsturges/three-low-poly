import { Vector3 } from "three";
import type { PathPoint } from "./PathPoint";

export interface SpiralPathOptions {
  /** Radius at the open end, before it winds in. Defaults to `1`. */
  startRadius?: number;
  /** How many turns it makes. Defaults to `1.5`. */
  turns?: number;
  /** How fast it winds in. `0` gives a plain circle; higher closes the curl faster. Defaults to `0.22`. */
  tightness?: number;
  /** Stations along the spiral. Defaults to `96`. */
  segments?: number;
}

/**
 * A logarithmic spiral — `r = r₀·e^(−kθ)` — in the XY plane.
 *
 * This is what a real wrought iron scroll follows. An Archimedean spiral (constant spacing) reads as
 * mechanical; a logarithmic one tightens as it winds, the way hot iron curls under a scroll jig.
 */
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
