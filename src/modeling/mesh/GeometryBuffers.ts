import { BufferAttribute, BufferGeometry } from "three";

/** 3D coordinate tuple. */
export type Vec3 = [number, number, number];
/** 2D coordinate tuple, used for profiles and UVs. */
export type Vec2 = [number, number];

/** The four flat arrays a `BufferGeometry` is assembled from. */
export interface GeometryBuffers {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}


export function createGeometryBuffers(): GeometryBuffers {
  return { positions: [], normals: [], uvs: [], indices: [] };
}

/** Per-corner UV order: (0,0), (0,1), (1,1), (1,0). */
export const UNIT_QUAD_UV: [Vec2, Vec2, Vec2, Vec2] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];

/**
 * Append four face-local vertices and triangles (0,1,2), (0,2,3). Corners must face outward by winding.
 * An omitted normal uses the first three corners; supplied normals are copied unchanged.
 *
 * ```ts
 * const buffers = createGeometryBuffers();
 *
 * pushQuad(
 *   buffers,
 *   [[-1, 0, -1], [-1, 0, 1], [1, 0, 1], [1, 0, -1]], // CCW seen from +Y
 *   [0, 1, 0],
 *   UNIT_QUAD_UV,
 * );
 *
 * const geometry = toBufferGeometry(buffers);
 * ```
 */
export function pushQuad(
  buffers: GeometryBuffers,
  corners: [Vec3, Vec3, Vec3, Vec3],
  normal: Vec3 | undefined,
  cornerUvs: [Vec2, Vec2, Vec2, Vec2] = UNIT_QUAD_UV,
): void {
  const face = normal ?? faceNormal(corners[0], corners[1], corners[2]);
  const base = buffers.positions.length / 3;

  for (const [x, y, z] of corners) {
    buffers.positions.push(x, y, z);
    buffers.normals.push(face[0], face[1], face[2]);
  }
  for (const [u, v] of cornerUvs) buffers.uvs.push(u, v);

  buffers.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/**
 * Append three face-local vertices and one triangle, counter-clockwise as seen from the outward side.
 * An omitted normal is derived from winding; supplied normals are copied unchanged.
 *
 * ```ts
 * // One face of a pyramid cap: two shoulder corners rising to the apex.
 * pushTriangle(
 *   buffers,
 *   [shoulderA, shoulderB, apex],
 *   undefined,                          // slanted face — let the winding derive the normal
 *   [[0, 0], [1, 0], [0.5, 1]],         // apex sits at the top-center of the texture
 * );
 * ```
 */
export function pushTriangle(
  buffers: GeometryBuffers,
  corners: [Vec3, Vec3, Vec3],
  normal?: Vec3,
  cornerUvs: [Vec2, Vec2, Vec2] = [
    [0, 0],
    [1, 0],
    [0.5, 1],
  ],
): void {
  const face = normal ?? faceNormal(corners[0], corners[1], corners[2]);
  const base = buffers.positions.length / 3;

  for (const [x, y, z] of corners) {
    buffers.positions.push(x, y, z);
    buffers.normals.push(face[0], face[1], face[2]);
  }
  for (const [u, v] of cornerUvs) buffers.uvs.push(u, v);

  buffers.indices.push(base, base + 1, base + 2);
}

/** Normalized (b − a) × (c − a), facing the viewer of CCW corners; degenerate triangles return a zero vector. */
export function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];

  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;

  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

/**
 * Copy arrays into an indexed BufferGeometry with position, normal and UV attributes and a bounding sphere.
 *
 * ```ts
 * const buffers = createGeometryBuffers();
 * pushQuad(buffers, corners, [0, 1, 0]);
 * const geometry = toBufferGeometry(buffers);
 * ```
 */
export function toBufferGeometry(buffers: GeometryBuffers): BufferGeometry {
  const geometry = new BufferGeometry();

  geometry.setIndex(buffers.indices);
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(buffers.positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(buffers.normals), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(buffers.uvs), 2));
  geometry.computeBoundingSphere();

  return geometry;
}
