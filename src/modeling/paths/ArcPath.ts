import { Vector3 } from "three";
import type { PathPoint } from "./PathPoint";

export interface ArcPathOptions {
  /** Radius in the XY plane. */
  radius?: number;
  /** Start angle in radians; 0 is +X. */
  startAngle?: number;
  /** End angle in radians. */
  endAngle?: number;
  /** Circle center; its Z coordinate sets the arc plane. */
  center?: Vector3;
  /** Number of arc intervals. */
  segments?: number;
}

/**
 * Circular arc in XY. A full 2π turn omits the repeated endpoint; use a closed sweep to join its seam.
 *
 * ```ts
 * const semicircle = arcPath({ radius: 2, startAngle: Math.PI, endAngle: 0 });
 * const ring       = arcPath({ radius: 0.3, startAngle: 0, endAngle: Math.PI * 2 });
 * ```
 */
export function arcPath({
  radius = 1,
  startAngle = 0,
  endAngle = Math.PI,
  center = new Vector3(),
  segments = 24,
}: ArcPathOptions = {}): PathPoint[] {
  const full = Math.abs(Math.abs(endAngle - startAngle) - Math.PI * 2) < 1e-9;
  const count = full ? segments : segments + 1;
  const direction = Math.sign(endAngle - startAngle) || 1;

  return Array.from({ length: count }, (_, i) => {
    const theta = startAngle + (endAngle - startAngle) * (i / segments);

    return {
      position: new Vector3(
        center.x + radius * Math.cos(theta),
        center.y + radius * Math.sin(theta),
        center.z,
      ),
      // d/dθ of (cos θ, sin θ), signed by which way we are going around.
      tangent: new Vector3(-Math.sin(theta), Math.cos(theta), 0).multiplyScalar(direction),
    };
  });
}
