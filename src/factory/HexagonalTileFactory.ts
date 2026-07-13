import { InstancedMesh, Material, MeshStandardMaterial, Object3D } from "three";
import { PolygonGeometry } from "../geometry/shapes/PolygonGeometry";

/**
 * Flat-top hexagon — a corner at ±X, edges level across the top and bottom.
 * The staggered-column spacing below assumes this orientation.
 */
const FLAT_TOP = Math.PI / 6;

/**
 * Hexagons already tile perfectly at a given radius, with all six neighbours the same distance
 * away. So a gap is *not* extra space added to the lattice — inflating the X and Z spacings
 * separately would stretch the grid unevenly and leave the gap wider on the diagonals than in the
 * columns. Instead the lattice stays a true hex grid and the tile is shrunk inside its cell.
 *
 * Shrinking a hexagon's inradius by `gap / 2` opens a uniform `gap` to every neighbour, and that
 * costs `gap / √3` of circumradius.
 */
const shrinkForGap = (gap: number) => gap / Math.sqrt(3);

export interface HexagonalTileCountOptions {
  width: number; // Total area width to fill (x-axis)
  depth: number; // Total area depth to fill (z-axis)
  height: number; // Height of each tile (y-axis)
  count: number; // Number of tiles along the x-axis
  gap: number; // Gap spacing between tiles
  material?: Material; // Optional custom material
}

/**
 * Hexagonal tile floor, sized by tile *count* — you say how many tiles span the width, and the tile
 * radius is solved to make them fit.
 *
 * Reach for this when the tile count is what you care about ("a 10-across floor"), and let the tiles
 * come out whatever size they need to be. Use {@link createHexagonalTilesByRadius} when the tile
 * size is what you care about and the count should fall out instead.
 *
 * Tiles are laid in staggered columns and centered on the origin. Rows are filled to whatever depth
 * fits, so the tile count is `count * (however many rows fit)` — not `count` alone.
 *
 * @example
 * ```ts
 * // A 10x10 floor, ten tiles across.
 * const floor = createHexagonalTilesByCount({
 *   width: 10,
 *   depth: 10,
 *   height: 0.01,
 *   count: 10,
 *   gap: 0.01,
 * });
 * scene.add(floor);
 *
 * // Tint each tile individually — InstancedMesh carries per-instance color.
 * floor.setColorAt(0, new Color("#c8b8a0"));
 * floor.instanceColor.needsUpdate = true;
 * ```
 */
export function createHexagonalTilesByCount(options: HexagonalTileCountOptions): InstancedMesh {
  const { width, depth, height, count, gap, material } = options;

  const tileMaterial = material ?? new MeshStandardMaterial({ color: 0xffffff });

  // `count` tiles across `width` fixes the lattice: columns sit 1.5 lattice-radii apart.
  const spacingX = width / count;
  const latticeRadius = (spacingX * 2) / 3;
  const spacingZ = Math.sqrt(3) * latticeRadius;

  // The gap is carved out of the tile, not added to the lattice. Pinning both `width` and `count`
  // leaves the tile as the only thing that can absorb the gap — and a tile cannot shrink past
  // nothing. When the gap will not fit, the GAP yields: the tiles are the point, the gap is slack.
  const maxShrink = latticeRadius * 0.95;
  const radius = latticeRadius - Math.min(shrinkForGap(gap), maxShrink);

  // Calculate the number of tiles that fit along the z-axis
  const countZ = Math.floor(depth / spacingZ);

  const hexTileCount = count * countZ;

  // Create a hexagonal prism geometry
  const geometry = new PolygonGeometry({ sides: 6, radius, depth: height, rotation: FLAT_TOP });

  // Rotate geometry so tiles lay flat
  geometry.rotateX(-Math.PI / 2);

  // Create the instanced mesh
  const instancedMesh = new InstancedMesh(geometry, tileMaterial, hexTileCount);

  const dummy = new Object3D();
  let index = 0;

  for (let x = 0; x < count; x++) {
    for (let z = 0; z < countZ; z++) {
      // Calculate the staggered row offset
      const offsetX = x * spacingX;
      const offsetZ = z * spacingZ + (x % 2) * (spacingZ / 2); // Stagger odd columns by half a tile

      // Center the grid
      const positionX = offsetX - (count * spacingX) / 2 + spacingX / 2;
      const positionZ = offsetZ - (countZ * spacingZ) / 2 + spacingZ / 2;

      dummy.position.set(positionX, 0, positionZ);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(index++, dummy.matrix);
    }
  }

  instancedMesh.instanceMatrix.needsUpdate = true;

  return instancedMesh;
}

export interface HexagonalTileRadiusOptions {
  width: number; // Total area width to fill (x-axis)
  depth: number; // Total area depth to fill (z-axis)
  height: number; // Height of each tile (y-axis)
  radius: number; // Radius of each hexagonal tile
  gap: number; // Gap spacing between tiles
  material?: Material; // Optional custom material
}

/**
 * Hexagonal tile floor, sized by tile *radius* — you say how big a tile is, and as many as fit are
 * laid down.
 *
 * The counterpart to {@link createHexagonalTilesByCount}: here the tile size is fixed and the count
 * falls out, which is what you want when the tiles have a real-world size. Tiles are laid in
 * staggered columns and centered on the origin; whatever does not fit is simply not placed, so the
 * floor may fall a little short of `width` / `depth`.
 *
 * @example
 * ```ts
 * // A 10x10 floor of 0.1-radius tiles — however many that turns out to be.
 * const floor = createHexagonalTilesByRadius({
 *   width: 10,
 *   depth: 10,
 *   height: 0.01,
 *   radius: 0.1,
 *   gap: 0.01,
 * });
 * scene.add(floor);
 *
 * floor.count; // an output — you find out how many fit
 * ```
 */
export function createHexagonalTilesByRadius(options: HexagonalTileRadiusOptions): InstancedMesh {
  const { width, depth, height, radius, gap, material } = options;

  const tileMaterial = material ?? new MeshStandardMaterial({ color: 0xffffff });

  // The tile is the size you asked for; the lattice grows around it to open the gap. Expanding the
  // lattice by `gap / √3` of radius opens a uniform `gap` to all six neighbours — inflating the X
  // and Z spacings separately would stretch the grid and leave the diagonals wider than the columns.
  const latticeRadius = radius + shrinkForGap(gap);
  const spacingX = (latticeRadius * 3) / 2;
  const spacingZ = Math.sqrt(3) * latticeRadius;

  // Calculate the number of tiles that fit within the area
  const hexTileCountX = Math.floor(width / spacingX);
  const hexTileCountZ = Math.floor(depth / spacingZ);

  const hexTileCount = hexTileCountX * hexTileCountZ;

  // Create a hexagonal prism geometry
  const geometry = new PolygonGeometry({ sides: 6, radius, depth: height, rotation: FLAT_TOP });

  // Rotate geometry so tiles lay flat
  geometry.rotateX(-Math.PI / 2);

  // Create the instanced mesh
  const instancedMesh = new InstancedMesh(geometry, tileMaterial, hexTileCount);

  const dummy = new Object3D();
  let index = 0;

  for (let x = 0; x < hexTileCountX; x++) {
    for (let z = 0; z < hexTileCountZ; z++) {
      // Calculate the staggered row offset
      const offsetX = x * spacingX;
      const offsetZ = z * spacingZ + (x % 2) * (spacingZ / 2); // Stagger odd rows by half a tile

      // Center the grid
      const positionX = offsetX - (hexTileCountX * spacingX) / 2 + spacingX / 2;
      const positionZ = offsetZ - (hexTileCountZ * spacingZ) / 2 + spacingZ / 2;

      dummy.position.set(positionX, 0, positionZ);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(index++, dummy.matrix);
    }
  }

  instancedMesh.instanceMatrix.needsUpdate = true;

  return instancedMesh;
}
