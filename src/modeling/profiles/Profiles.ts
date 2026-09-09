import type { Vec2 } from "../mesh/GeometryBuffers";



/** Centered CCW rectangle: thickness along station normal, width along binormal. */
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
 * CCW circle in the station (normal, binormal) plane; rotation sets the seam angle in radians.
 * A half-segment offset aligns flats with the axes; θ=0 aligns vertices.
 */
export function circleProfile(radius: number, segments: number, rotation = Math.PI / segments): Vec2[] {
  return Array.from({ length: segments }, (_, i) => {
    const a = rotation + (i / segments) * Math.PI * 2;
    return [Math.cos(a) * radius, Math.sin(a) * radius] as Vec2;
  });
}
