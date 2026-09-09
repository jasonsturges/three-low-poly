import { BufferGeometry, Vector3 } from "three";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec2,
  type Vec3,
} from "../mesh/GeometryBuffers";

export interface SurfaceGridOptions {
  /** Reverse winding and normals; u along +X and v along +Y ordinarily faces +Z. */
  flip?: boolean;
}

/**
 * Skin rectangular grid[v][u] without wrapping, using whole-sheet UVs.
 * Fewer than two rows or columns returns empty geometry; otherwise ragged rows throw.
 *
 * ```ts
 * // Any f(u, v). Here, a hanging sheet.
 * const grid = Array.from({ length: rows + 1 }, (_, j) =>
 *   Array.from({ length: columns + 1 }, (_, i) => surfacePoint(i / columns, j / rows)),
 * );
 * const geometry = surfaceGrid(grid);
 * ```
 */
export function surfaceGrid(grid: Vector3[][], { flip = false }: SurfaceGridOptions = {}): BufferGeometry {
  const buffers = createGeometryBuffers();
  const rows = grid.length;
  if (rows < 2) return toBufferGeometry(buffers);

  const columns = grid[0]!.length;
  if (columns < 2) return toBufferGeometry(buffers);

  for (let j = 0; j < rows; j++) {
    if (grid[j]!.length !== columns) {
      throw new Error(
        `surfaceGrid() requires a rectangular grid: row 0 has ${columns} points, row ${j} has ${grid[j]!.length}.`,
      );
    }
  }

  const xyz = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  const edge = new Vector3();
  const other = new Vector3();
  const normal = new Vector3();

  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < columns - 1; i++) {
      const a = grid[j]![i]!;
      const b = grid[j]![i + 1]!;
      const c = grid[j + 1]![i + 1]!;
      const d = grid[j + 1]![i]!;

      // Diagonal normal (c − a) × (d − b) remains usable when three corners are collinear.
      normal.copy(edge.subVectors(c, a).cross(other.subVectors(d, b)));

      // Genuinely no area: the tip of the pinch, where every row has arrived at one point.
      if (normal.lengthSq() < 1e-20) continue;
      normal.normalize();
      if (flip) normal.negate();

      const face: Vec3 = [normal.x, normal.y, normal.z];

      const u0 = i / (columns - 1);
      const u1 = (i + 1) / (columns - 1);
      const v0 = j / (rows - 1);
      const v1 = (j + 1) / (rows - 1);

      // Emit one triangle when either u-boundary edge collapses.
      const ad = a.distanceToSquared(d) < 1e-14;
      const bc = b.distanceToSquared(c) < 1e-14;

      if (ad) {
        const corners: [Vec3, Vec3, Vec3] = flip ? [xyz(a), xyz(c), xyz(b)] : [xyz(a), xyz(b), xyz(c)];
        const uvs: [Vec2, Vec2, Vec2] = flip
          ? [[u0, v0], [u1, v1], [u1, v0]]
          : [[u0, v0], [u1, v0], [u1, v1]];
        pushTriangle(buffers, corners, face, uvs);
      } else if (bc) {
        const corners: [Vec3, Vec3, Vec3] = flip ? [xyz(a), xyz(d), xyz(b)] : [xyz(a), xyz(b), xyz(d)];
        const uvs: [Vec2, Vec2, Vec2] = flip
          ? [[u0, v0], [u0, v1], [u1, v0]]
          : [[u0, v0], [u1, v0], [u0, v1]];
        pushTriangle(buffers, corners, face, uvs);
      } else {
        const corners: [Vec3, Vec3, Vec3, Vec3] = flip
          ? [xyz(a), xyz(d), xyz(c), xyz(b)]
          : [xyz(a), xyz(b), xyz(c), xyz(d)];
        const uvs: [Vec2, Vec2, Vec2, Vec2] = flip
          ? [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]
          : [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
        pushQuad(buffers, corners, face, uvs);
      }
    }
  }

  return toBufferGeometry(buffers);
}
