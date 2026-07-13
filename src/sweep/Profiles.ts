import type { Vec2 } from "../utils/GeometryBuffers";

/**
 * Cross-sections to carry along a path.
 *
 * A profile lives in the station's own `(normal, binormal)` plane, wound counter-clockwise. Swap one
 * for another and a masonry arch becomes a wrought iron tube — the path never knows.
 */

/** A rectangular cross-section, centered on the station. Flat bar, a masonry band, a stringer. */
export function rectProfile(width: number, thickness: number): Vec2[] {
  const hw = width / 2;
  const ht = thickness / 2;

  return [
    [-ht, -hw],
    [ht, -hw],
    [ht, hw],
    [-ht, hw],
  ];
}

/**
 * A circular cross-section. `segments` is the low-poly knob — `4` gives square tubing, `24` a round bar.
 *
 * The ring starts at a half-segment offset so the flats face outward rather than the corners. Without
 * it, four segments would put vertices on the axes and you would get a diamond, not a square — the same
 * trap `CylinderGeometry` has, because it starts its ring at θ=0.
 */
export function circleProfile(radius: number, segments: number, rotation = Math.PI / segments): Vec2[] {
  return Array.from({ length: segments }, (_, i) => {
    const a = rotation + (i / segments) * Math.PI * 2;
    return [Math.cos(a) * radius, Math.sin(a) * radius] as Vec2;
  });
}
