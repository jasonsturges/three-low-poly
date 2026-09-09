import { Vector3 } from "three";
import type { PathPoint } from "./PathPoint";

export interface HelixPathOptions {
  /** Radial distance from the Y axis. */
  radius?: number;
  /** Total displacement along +Y. */
  height?: number;
  /** Number of turns. */
  turns?: number;
  /** Start angle in radians. */
  startAngle?: number;
  /** Number of helix intervals. */
  segments?: number;
}

/** Helix about +Y with circular sections in XZ; samples include both endpoints and carry derivatives. */
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
