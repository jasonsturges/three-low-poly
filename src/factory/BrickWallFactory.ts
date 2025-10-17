import {
  InstancedMesh,
  Matrix4,
  Vector3,
  Euler,
  Quaternion,
  MeshStandardMaterial,
  Material,
  InstancedBufferAttribute,
  Color,
} from "three";
import { BrickGeometry } from "../geometry/architecture/BrickGeometry";

export interface BrickWallOptions {
  // Wall dimensions
  wallWidth?: number;
  wallHeight?: number;

  // Brick dimensions
  brickWidth?: number;
  brickHeight?: number;
  brickDepth?: number;

  // Spacing
  mortarGap?: number;

  // Pattern
  offsetPattern?: boolean; // running bond vs stack bond

  // Visual variation
  brickColors?: number[];
  colorVariation?: boolean;

  // Position variation (slight randomness for organic feel)
  positionVariation?: number;
  rotationVariation?: number;

  // Material
  material?: Material;
}

/**
 * Creates an instanced mesh brick wall with running bond pattern.
 *
 * @example
 * ```ts
 * const wall = createBrickWall({
 *   wallWidth: 10,
 *   wallHeight: 8,
 *   brickColors: [0x8b4513, 0xa0522d, 0x6b3410],
 *   colorVariation: true
 * });
 * scene.add(wall);
 * ```
 */
export function createBrickWall({
  wallWidth = 10,
  wallHeight = 8,
  brickWidth = 0.8,
  brickHeight = 0.3,
  brickDepth = 0.4,
  mortarGap = 0.05,
  offsetPattern = true,
  brickColors = [0x8b4513, 0xa0522d, 0x6b3410],
  colorVariation = true,
  positionVariation = 0.02,
  rotationVariation = 0.01,
  material,
}: BrickWallOptions = {}): InstancedMesh {
  const brickMaterial = material || new MeshStandardMaterial({ color: 0x8b4513 });
  // Calculate layout
  const effectiveBrickWidth = brickWidth + mortarGap;
  const effectiveBrickHeight = brickHeight + mortarGap;

  const bricksPerRow = Math.floor(wallWidth / effectiveBrickWidth);
  const rowCount = Math.floor(wallHeight / effectiveBrickHeight);
  const totalBricks = bricksPerRow * rowCount;

  // Create geometry and instanced mesh
  const geometry = new BrickGeometry({
    width: brickWidth,
    height: brickHeight,
    depth: brickDepth,
  });

  const brickWall = new InstancedMesh(geometry, brickMaterial, totalBricks);

  // Prepare color attribute if variation is enabled
  let colors: Float32Array | undefined;
  if (colorVariation && brickColors.length > 0) {
    colors = new Float32Array(totalBricks * 3);
  }

  // Position bricks
  const matrix = new Matrix4();
  const position = new Vector3();
  const rotation = new Euler();
  const quaternion = new Quaternion();
  const scale = new Vector3(1, 1, 1);

  let instanceIndex = 0;

  for (let row = 0; row < rowCount; row++) {
    const yPosition = row * effectiveBrickHeight - wallHeight / 2 + brickHeight / 2;

    // Calculate row offset for running bond pattern
    let xOffset = 0;
    if (offsetPattern && row % 2 === 1) {
      xOffset = effectiveBrickWidth / 2;
    }

    for (let col = 0; col < bricksPerRow; col++) {
      const xPosition = col * effectiveBrickWidth - wallWidth / 2 + brickWidth / 2 + xOffset;

      // Skip brick if it extends beyond wall width (for offset rows)
      if (Math.abs(xPosition) > wallWidth / 2) continue;

      // Base position
      position.set(xPosition, yPosition, 0);

      // Add subtle position variation
      if (positionVariation > 0) {
        position.x += (Math.random() - 0.5) * positionVariation;
        position.y += (Math.random() - 0.5) * positionVariation;
        position.z += (Math.random() - 0.5) * positionVariation;
      }

      // Add subtle rotation variation
      rotation.set(0, 0, 0);
      if (rotationVariation > 0) {
        rotation.x = (Math.random() - 0.5) * rotationVariation;
        rotation.y = (Math.random() - 0.5) * rotationVariation;
        rotation.z = (Math.random() - 0.5) * rotationVariation;
      }

      // Build matrix
      quaternion.setFromEuler(rotation);
      matrix.compose(position, quaternion, scale);
      brickWall.setMatrixAt(instanceIndex, matrix);

      // Set color variation
      if (colors) {
        const colorIndex = Math.floor(Math.random() * brickColors.length);
        const color = new Color(brickColors[colorIndex]);
        colors[instanceIndex * 3] = color.r;
        colors[instanceIndex * 3 + 1] = color.g;
        colors[instanceIndex * 3 + 2] = color.b;
      }

      instanceIndex++;
    }
  }

  // Apply color attribute if enabled
  if (colors && brickMaterial instanceof MeshStandardMaterial) {
    geometry.setAttribute("color", new InstancedBufferAttribute(colors, 3));
    brickMaterial.vertexColors = true;
  }

  // Update instance count to actual number of bricks placed
  brickWall.count = instanceIndex;

  return brickWall;
}
