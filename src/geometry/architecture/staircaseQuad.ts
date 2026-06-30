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