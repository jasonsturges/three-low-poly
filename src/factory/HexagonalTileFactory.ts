import { InstancedMesh, Material, MeshStandardMaterial, Object3D } from "three";
import { HexagonGeometry } from "../geometry/shapes/HexagonGeometry";

export interface HexagonalTileCountOptions {
  width: number; // Total area width to fill (x-axis)
  depth: number; // Total area depth to fill (z-axis)
  height: number; // Height of each tile (y-axis)
  count: number; // Number of tiles along the x-axis
  gap: number; // Gap spacing between tiles
  material?: Material; // Optional custom material
}

/**
 * Hexagonal tile pattern factory with density control.
 *
 * Example usage:
 * ```ts
 * const hexTile = createHexagonalTilesByCount({
 *   width: 10,
 *   depth: 10,
 *   height: 0.01,
 *   count: 10, // 10 tiles along the x-axis
 *   gap: 0.01,
 *   material: new THREE.MeshStandardMaterial({ color: 0xffffff }),
 * });
 *
 * scene.add(hexTile);
 * ```
 */
export function createHexagonalTilesByCount(options: HexagonalTileCountOptions): InstancedMesh {
  const { width, depth, height, count, gap, material } = options;

  const tileMaterial = material || new MeshStandardMaterial({ color: 0xffffff });

  // Calculate the radius based on the x-axis count and area width
  const spacingX = width / count; // Horizontal spacing including gap
  const radius = ((spacingX - gap) * 2) / 3; // Adjusted for hexagonal geometry

  // Effective spacing between hexagon centers
  const effectiveSpacingZ = Math.sqrt(3) * radius + gap;

  // Calculate the number of tiles that fit along the z-axis
  const countZ = Math.floor(depth / effectiveSpacingZ);

  const hexTileCount = count * countZ;

  // Create a hexagonal prism geometry
  const geometry = new HexagonGeometry(radius, height);

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
      const offsetZ = z * effectiveSpacingZ + (x % 2) * (effectiveSpacingZ / 2); // Stagger odd rows by half a tile

      // Center the grid
      const positionX = offsetX - (count * spacingX) / 2 + spacingX / 2;
      const positionZ = offsetZ - (countZ * effectiveSpacingZ) / 2 + effectiveSpacingZ / 2;

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
 * Hexagonal tile pattern factory.
 *
 * Example usage:
 * ```ts
 *     const hexTile = createHexagonalTilesByRadius({
 *       width: 10,
 *       depth: 10,
 *       height: 0.01,
 *       radius: 0.1,
 *       gap: 0.01,
 *       material: new THREE.MeshStandardMaterial({ color: 0xffffff }),
 *     });
 *
 *     scene.add(hexTile);
 * ```
 */
export function createHexagonalTilesByRadius(options: HexagonalTileRadiusOptions): InstancedMesh {
  const { width, depth, height, radius, gap, material } = options;

  const tileMaterial = material || new MeshStandardMaterial({ color: 0xffffff });

  // Effective spacing between hexagon centers, including the gap
  const spacingX = (radius * 3) / 2 + gap; // Horizontal distance between hex centers
  const spacingZ = Math.sqrt(3) * radius + gap; // Vertical distance between hex centers

  // Calculate the number of tiles that fit within the area
  const hexTileCountX = Math.floor(width / spacingX);
  const hexTileCountZ = Math.floor(depth / spacingZ);

  const hexTileCount = hexTileCountX * hexTileCountZ;

  // Create a hexagonal prism geometry
  const geometry = new HexagonGeometry(radius, height);

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
