import { Vector3 } from "three";
import type { PathPoint } from "./PathPoint";

export interface ArcPathOptions {
  /** Radius of the arc. Defaults to `1`. */
  radius?: number;
  /** Where the arc begins, in radians. `0` is +X. Defaults to `0`. */
  startAngle?: number;
  /** Where it ends. Defaults to `Math.PI`. */
  endAngle?: number;
  /** Center of the arc. Defaults to the origin. */
  center?: Vector3;
  /** Stations along the arc — the smoothness. Defaults to `24`. */
  segments?: number;
}

/**
 * A circular arc in the XY plane — the plane of a wall.
 *
 * **180° is not special.** Sweep a quarter, a half, past 180° for a C, or a full `2π` for a closed
 * ring — the decorative circles between wrought iron pickets. A full ring correctly omits the repeated
 * start point; pass `closed: true` to the sweep and its wrap is what joins the seam.
 *
 * @example
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
  // A full ring must not repeat its start point — the sweep's `closed` wrap is what joins it.
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
