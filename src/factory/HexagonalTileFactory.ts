import { ExtrudeGeometry, InstancedMesh, Material, MeshStandardMaterial, Object3D, Shape } from "three";

export interface HexagonalTileOptions {
  width: number;       // Total area width to fill (x-axis)
  depth: number;       // Total area depth to fill (z-axis)
  height: number;      // Height of each tile (y-axis)
  radius: number;      // Radius of each hexagonal tile
  gap: number;         // Gap spacing between tiles
  material?: Material; // Optional custom material
}

/**
 * Hexagonal tile pattern factory.
 *
 * Example usage:
 * ```ts
 *     const hexTile = createHexagonalTile({
 *       width: 10,
 *       depth: 10,
 *       height: 0.01,
 *       radius: 0.1,
 *       gap: 0.01,
 *       material: new THREE.MeshStandardMaterial({ color: ColorPalette.White }),
 *     });
 *
 *     scene.add(hexTile);
 * ```
 */
export function createHexagonalTile(options: HexagonalTileOptions): InstancedMesh {
  const { width, depth, height, radius, gap, material } = options;

  const tileMaterial = material || new MeshStandardMaterial({ color: 0x8b4513 }); // Default earthy color

  // Effective spacing between hexagon centers, including the gap
  const spacingX = (radius * 3) / 2 + gap; // Horizontal distance between hex centers
  const spacingZ = Math.sqrt(3) * radius + gap; // Vertical distance between hex centers

  // Calculate the number of tiles that fit within the area
  const hexTileCountX = Math.floor(width / spacingX);
  const hexTileCountZ = Math.floor(depth / spacingZ);

  const hexTileCount = hexTileCountX * hexTileCountZ;

  // Create a hexagonal prism geometry
  const hexShape = new Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i; // 60-degree increments
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (i === 0) hexShape.moveTo(x, y);
    else hexShape.lineTo(x, y);
  }
  hexShape.closePath();
  const geometry = new ExtrudeGeometry(hexShape, { depth: height, bevelEnabled: false });

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
