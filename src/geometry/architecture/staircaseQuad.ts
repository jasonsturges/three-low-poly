import { pushQuad, UNIT_QUAD_UV, type GeometryBuffers } from "../../utils/GeometryBuffers";

/**
 * Stair vocabulary over the {@link pushQuad} primitive — a riser, a tread, a landing.
 *
 * Everything here works in the flight's own frame: centered on X, rising +Y, running +Z. There are
 * deliberately no X-axis variants. A turned flight is the *same* flight rotated, not a second one
 * hand-derived in a rotated frame.
 */

/** Riser — the vertical face of a step, facing +Z at `zFront`. */
export function pushRiser(
  buffers: GeometryBuffers,
  hw: number,
  yBottom: number,
  yTop: number,
  zFront: number,
): void {
  pushQuad(
    buffers,
    [
      [-hw, yBottom, zFront],
      [-hw, yTop, zFront],
      [hw, yTop, zFront],
      [hw, yBottom, zFront],
    ],
    [0, 0, 1],
    UNIT_QUAD_UV,
  );
}

/** Tread — the horizontal face you stand on, facing +Y between `zFront` and `zBack`. */
export function pushTread(
  buffers: GeometryBuffers,
  hw: number,
  yTop: number,
  zFront: number,
  zBack: number,
): void {
  pushQuad(
    buffers,
    [
      [-hw, yTop, zFront],
      [-hw, yTop, zBack],
      [hw, yTop, zBack],
      [hw, yTop, zFront],
    ],
    [0, 1, 0],
    UNIT_QUAD_UV,
  );
}

/** Point on the XZ circle at `angle` (radians, +Y up, 0 = +X, CCW = +Z). */
export function polarXZ(radius: number, angle: number): [number, number] {
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

/** Tangent on the XZ circle at `angle`, CCW when viewed from +Y. */
export function tangentXZ(angle: number): [number, number, number] {
  return [-Math.sin(angle), 0, Math.cos(angle)];
}

/**
 * Spiral riser — vertical quad along one radial line at `angle`.
 * Normal faces the CCW climb direction (turret stair ascending counter-clockwise).
 */
export function pushSpiralRiser(
  buffers: GeometryBuffers,
  innerRadius: number,
  outerRadius: number,
  yBottom: number,
  yTop: number,
  angle: number,
): void {
  const [xi, zi] = polarXZ(innerRadius, angle);
  const [xo, zo] = polarXZ(outerRadius, angle);

  pushQuad(
    buffers,
    [
      [xi, yBottom, zi],
      [xi, yTop, zi],
      [xo, yTop, zo],
      [xo, yBottom, zo],
    ],
    tangentXZ(angle),
    UNIT_QUAD_UV,
  );
}

/**
 * Spiral tread — horizontal trapezoid between inner/outer radii from `angleStart`
 * to `angleEnd` (exclusive overlap with the next step when angles are contiguous).
 */
export function pushSpiralTread(
  buffers: GeometryBuffers,
  innerRadius: number,
  outerRadius: number,
  yTop: number,
  angleStart: number,
  angleEnd: number,
): void {
  const [xIf, zIf] = polarXZ(innerRadius, angleStart);
  const [xIb, zIb] = polarXZ(innerRadius, angleEnd);
  const [xOb, zOb] = polarXZ(outerRadius, angleEnd);
  const [xOf, zOf] = polarXZ(outerRadius, angleStart);

  pushQuad(
    buffers,
    [
      [xIf, yTop, zIf],
      [xIb, yTop, zIb],
      [xOb, yTop, zOb],
      [xOf, yTop, zOf],
    ],
    [0, 1, 0],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  );
}
