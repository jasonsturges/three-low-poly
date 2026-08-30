import { BufferGeometry, Vector3 } from "three";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec2,
  type Vec3,
} from "../utils/GeometryBuffers";

export interface SurfaceGridOptions {
  /**
   * Flip the surface's facing. Defaults to `false`.
   *
   * The normal comes out on the side a viewer sees the grid wound counter-clockwise from — `+Z` for a
   * grid laid out with `u` running `+X` and `v` running `+Y`. Set this when the natural parameterization
   * of a shape happens to face away from where it is meant to be seen from.
   */
  flip?: boolean;
}

/**
 * Skin an open grid of points — the sheet counterpart to {@link loft}.
 *
 * **This is not `loft`, and the difference is topological rather than cosmetic.** A loft's sections are
 * closed RINGS and it wraps the last point of each back onto the first; run an open sheet through it and
 * the surface folds over on itself along a seam that was never there. This stitches a rectangular grid
 * with no wrapping in either direction, which is what every parametric surface wants: a curtain, a vault
 * web, a sail, a NURBS patch evaluated on a grid, any `f(u, v)` at all.
 *
 * `grid[v][u]` — the outer array runs down the surface, the inner across it. Every row must be the same
 * length; a ragged grid throws rather than skinning something arbitrary.
 *
 * UVs are laid out across the whole sheet rather than per quad, so a texture maps over the surface as one
 * image. That is the one place this differs in substance from the hand-rolled versions it replaces, which
 * all took `pushQuad`'s per-quad default and would tile a texture once per face.
 *
 * @example
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

      // THE NORMAL COMES FROM THE DIAGONALS, `(c − a) × (d − b)`, and not from three of the corners.
      //
      // Wherever a parametric surface pinches — a swag cinched to its horns, a vault cell closing on its
      // boss, a cone approaching its apex — three consecutive corners go very nearly collinear while the
      // quad still has area. The three-corner form then divides by a vanishing cross product and hands
      // back a zero normal, which shades black rather than failing loudly. The diagonals survive any
      // three corners lining up, and cost the same arithmetic.
      normal.copy(edge.subVectors(c, a).cross(other.subVectors(d, b)));

      // Genuinely no area: the tip of the pinch, where every row has arrived at one point.
      if (normal.lengthSq() < 1e-20) continue;
      normal.normalize();
      if (flip) normal.negate();

      const face: Vec3 = [normal.x, normal.y, normal.z];

      // UVs across the WHOLE sheet, so a texture is one image rather than one per face.
      const u0 = i / (columns - 1);
      const u1 = (i + 1) / (columns - 1);
      const v0 = j / (rows - 1);
      const v1 = (j + 1) / (rows - 1);

      // A collapsed side is a triangle, not a zero-area quad. Two wasted vertices is the smaller cost;
      // the real one is that a degenerate quad's winding is undefined.
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
