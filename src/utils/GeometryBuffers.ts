import { BufferAttribute, BufferGeometry } from "three";

/** A position in 3D, as a plain tuple — no allocation, no wrapper object. */
export type Vec3 = [number, number, number];
/** A UV coordinate, as a plain tuple. */
export type Vec2 = [number, number];

/** The four flat arrays a `BufferGeometry` is assembled from. */
export interface GeometryBuffers {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

/** Fresh, empty buffers. */
export function createGeometryBuffers(): GeometryBuffers {
  return { positions: [], normals: [], uvs: [], indices: [] };
}

/** UVs for a quad whose corners are given counter-clockwise from the bottom-left. */
export const UNIT_QUAD_UV: [Vec2, Vec2, Vec2, Vec2] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];

/**
 * Append one quad — two triangles — to a set of geometry buffers. Corners must be counter-clockwise
 * when viewed along `normal`.
 *
 * This is the library's geometry primitive, and it is deliberately *just a function*. It does not
 * own your data, invent a vertex type, or ask you to build inside a session: it takes the flat
 * arrays you already have and pushes onto them. Write a quad with it, hand-write the next one, mix
 * it with merged primitives — it does not care. Utilities that own your data structure get
 * abandoned; utilities that operate on it get used.
 *
 * Every quad carries its own four vertices with a single face normal, which is what gives low-poly
 * geometry its faceted read. Vertices are not shared between quads, and that is on purpose.
 *
 * @example
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
 * Append one triangle. Corners must be counter-clockwise when viewed along `normal`.
 *
 * The companion to {@link pushQuad}, and you need it wherever a surface closes to a point — the cap
 * of an obelisk, the tip of a spire, the apex of a roof. Faking those with a quad means duplicating
 * a corner, which buys you a wasted vertex and a zero-area triangle.
 *
 * @example
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

/**
 * Face normal of the triangle `a → b → c`, from the cross product of its edges. Points toward a
 * viewer for whom the corners wind counter-clockwise.
 *
 * Pass a normal to {@link pushQuad} when you already know it — you usually do, and it is exact.
 * Reach for this when you don't: when the face was computed, swept, or lofted rather than authored.
 */
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
 * Assemble buffers into a {@link BufferGeometry} — indexed, with position, normal, and uv.
 *
 * @example
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
