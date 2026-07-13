import { Vector3 } from "three";
import type { PathPoint } from "./PathPoint";

export interface HelixPathOptions {
  /** Radius of the coil. Defaults to `1`. */
  radius?: number;
  /** Total climb. Defaults to `2`. */
  height?: number;
  /** How many times it wraps on the way up. Defaults to `3`. */
  turns?: number;
  /** Angle it starts at, in radians. Defaults to `0`. */
  startAngle?: number;
  /** Stations along the coil. Defaults to `96`. */
  segments?: number;
}

/**
 * A helix — a circle that climbs. Corkscrews, springs, a handrail winding a spiral stair.
 *
 * Climbs +Y with its circle in XZ, the plane of the ground.
 *
 * This is a path that genuinely leaves its plane, so it is where parallel transport earns its keep:
 * Frenet frames spin the cross-section as it rises, for no reason the path ever asked for.
 */
export function helixPath({
  radius = 1,
  height = 2,
  turns = 3,
  startAngle = 0,
  segments = 96,
}: HelixPathOptions = {}): PathPoint[] {
  const dTheta = turns * Math.PI * 2; // θ'(t)

  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const theta = startAngle + dTheta * t;

    return {
      position: new Vector3(radius * Math.cos(theta), height * t, radius * Math.sin(theta)),
      // dx/dt = −r·sinθ·θ' ; dy/dt = height ; dz/dt = r·cosθ·θ'
      tangent: new Vector3(
        -radius * Math.sin(theta) * dTheta,
        height,
        radius * Math.cos(theta) * dTheta,
      ),
    };
  });
}
