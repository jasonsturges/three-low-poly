export type StairVec3 = [number, number, number];
export type StairVec2 = [number, number];

/**
 * Append one quad (two triangles). Corners must be CCW when viewed along `normal`.
 */
export function pushQuad(
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  corners: [StairVec3, StairVec3, StairVec3, StairVec3],
  normal: StairVec3,
  cornerUvs: [StairVec2, StairVec2, StairVec2, StairVec2],
): void {
  const base = positions.length / 3;
  for (const [x, y, z] of corners) {
    positions.push(x, y, z);
    normals.push(...normal);
  }
  for (const [u, v] of cornerUvs) uvs.push(u, v);
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

export const UNIT_QUAD_UV: [StairVec2, StairVec2, StairVec2, StairVec2] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];

/** Riser facing +Z at `zFront`. */
export function pushRiserZ(
  buffers: { positions: number[]; normals: number[]; uvs: number[]; indices: number[] },
  hw: number,
  yBottom: number,
  yTop: number,
  zFront: number,
): void {
  pushQuad(
    buffers.positions,
    buffers.normals,
    buffers.uvs,
    buffers.indices,
    [
      [-hw, yBottom, zFront],
      [-hw, yTop, zFront],
      [hw, yTop, zFront],
      [hw, yBottom, zFront],
    ],
    [0, 0, 1],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  );
}

/** Tread facing +Y between `zFront` and `zBack`. */
export function pushTreadZ(
  buffers: { positions: number[]; normals: number[]; uvs: number[]; indices: number[] },
  hw: number,
  yTop: number,
  zFront: number,
  zBack: number,
): void {
  pushQuad(
    buffers.positions,
    buffers.normals,
    buffers.uvs,
    buffers.indices,
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

/** Riser facing +X at `xFront` (second flight climbing −X). */
export function pushRiserX(
  buffers: { positions: number[]; normals: number[]; uvs: number[]; indices: number[] },
  yBottom: number,
  yTop: number,
  xFront: number,
  zNear: number,
  zFar: number,
): void {
  pushQuad(
    buffers.positions,
    buffers.normals,
    buffers.uvs,
    buffers.indices,
    [
      [xFront, yBottom, zFar],
      [xFront, yBottom, zNear],
      [xFront, yTop, zNear],
      [xFront, yTop, zFar],
    ],
    [1, 0, 0],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  );
}

/** Tread facing +Y between `xFront` and `xBack` (second flight climbing −X). */
export function pushTreadX(
  buffers: { positions: number[]; normals: number[]; uvs: number[]; indices: number[] },
  yTop: number,
  xFront: number,
  xBack: number,
  zNear: number,
  zFar: number,
): void {
  pushQuad(
    buffers.positions,
    buffers.normals,
    buffers.uvs,
    buffers.indices,
    [
      [xFront, yTop, zNear],
      [xFront, yTop, zFar],
      [xBack, yTop, zFar],
      [xBack, yTop, zNear],
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
  buffers: { positions: number[]; normals: number[]; uvs: number[]; indices: number[] },
  innerRadius: number,
  outerRadius: number,
  yBottom: number,
  yTop: number,
  angle: number,
): void {
  const [xi, zi] = polarXZ(innerRadius, angle);
  const [xo, zo] = polarXZ(outerRadius, angle);
  const normal = tangentXZ(angle);

  pushQuad(
    buffers.positions,
    buffers.normals,
    buffers.uvs,
    buffers.indices,
    [
      [xi, yBottom, zi],
      [xi, yTop, zi],
      [xo, yTop, zo],
      [xo, yBottom, zo],
    ],
    normal,
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  );
}

/**
 * Spiral tread — horizontal trapezoid between inner/outer radii from `angleStart`
 * to `angleEnd` (exclusive overlap with the next step when angles are contiguous).
 */
export function pushSpiralTread(
  buffers: { positions: number[]; normals: number[]; uvs: number[]; indices: number[] },
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
    buffers.positions,
    buffers.normals,
    buffers.uvs,
    buffers.indices,
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

/** Landing platform facing +Y. */
export function pushLanding(
  buffers: { positions: number[]; normals: number[]; uvs: number[]; indices: number[] },
  hw: number,
  y: number,
  zNear: number,
  zFar: number,
): void {
  pushQuad(
    buffers.positions,
    buffers.normals,
    buffers.uvs,
    buffers.indices,
    [
      [-hw, y, zNear],
      [-hw, y, zFar],
      [hw, y, zFar],
      [hw, y, zNear],
    ],
    [0, 1, 0],
    UNIT_QUAD_UV,
  );
}