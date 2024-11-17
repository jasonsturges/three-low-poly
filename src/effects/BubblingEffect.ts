import { BufferGeometry, InstancedMesh, Material, Matrix4, MeshStandardMaterial, SphereGeometry, Vector3 } from "three";

export interface BubblingEffectOptions {
  geometry?: BufferGeometry;
  material?: Material;
  count?: number;
  height?: number;
  width?: number;
  depth?: number;
}

export class BubblingEffect extends InstancedMesh {
  private bubblePositions: Vector3[] = [];
  private velocities: number[] = [];
  private width: number;
  private height: number;
  private depth: number;

  constructor(options: BubblingEffectOptions = {}) {
    const {
      count = 20,
      width = 1.5,
      height = 3,
      depth = 1.5,
      geometry = new SphereGeometry(0.1, 6, 6), // Small spheres
      material = new MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        roughness: 0.3,
        metalness: 0.3,
      }),
    } = options;
    super(geometry, material, count);

    this.height = height;
    this.width = width;
    this.depth = depth;

    // Initialize bubble positions and speeds
    for (let i = 0; i < this.count; i++) {
      const position = new Vector3(
        (Math.random() - 0.5) * width,
        Math.random() * (height - 1) + 0.5,
        (Math.random() - 0.5) * depth,
      );
      this.bubblePositions.push(position);
      this.velocities.push(0.01 + Math.random() * 0.02);
      this.updateInstanceMatrix(i);
    }
  }

  /**
   * Updates the position of a specific bubble instance in the InstancedMesh.
   */
  private updateInstanceMatrix(index: number): void {
    const position = this.bubblePositions[index];
    const matrix = new Matrix4().setPosition(position);
    this.setMatrixAt(index, matrix);
    this.instanceMatrix.needsUpdate = true;
  }

  /**
   * Updates bubble positions, moving them upward and resetting them
   * to the bottom if they reach the top.
   */
  public update(): void {
    for (let i = 0; i < this.count; i++) {
      const position = this.bubblePositions[i];
      position.y += this.velocities[i]; // Move bubble upwards

      // Reset bubble to bottom if it reaches the top
      if (position.y > this.height) {
        position.x = (Math.random() - 0.5) * this.width;
        position.y = 0;
        position.z = (Math.random() - 0.5) * this.depth;
      }

      this.updateInstanceMatrix(i);
    }
  }
}
