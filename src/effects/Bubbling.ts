import { InstancedMesh, Matrix4, MeshStandardMaterial, SphereGeometry, Vector3 } from "three";
import { randomFloat } from "../utils/RandomNumberUtils";

export class Bubbling extends InstancedMesh {
  private bubbleCount: number = 20;
  private bubblePositions: Vector3[] = [];
  private bubbleSpeeds: number[] = [];
  private maxHeight: number = 3;
  private maxWidth: number = 1.5;
  private maxDepth: number = 1.5;

  constructor({
    bubbleCount = 20, //
    maxHeight = 3,
    maxWidth = 1.5,
    maxDepth = 1.5,
  } = {}) {
    // Bubble geometry and material
    const bubbleGeometry = new SphereGeometry(0.1, 6, 6); // Small spheres
    const bubbleMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.3,
      metalness: 0.3,
    });

    super(bubbleGeometry, bubbleMaterial, bubbleCount); // Initialize InstancedMesh with count

    this.bubbleCount = bubbleCount;
    this.maxHeight = maxHeight;
    this.maxWidth = maxWidth;
    this.maxDepth = maxDepth;

    // Initialize bubble positions and speeds
    for (let i = 0; i < this.bubbleCount; i++) {
      const position = new Vector3(
        randomFloat(-(maxWidth / 2), maxWidth / 2),
        Math.random() * maxHeight,
        randomFloat(-(maxDepth / 2), maxDepth / 2),
      );
      this.bubblePositions.push(position);
      this.bubbleSpeeds.push(0.01 + Math.random() * 0.02);
      this.updateInstanceMatrix(i);
    }

    // Start the animation loop
    this.animateBubbles();
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
  private updateBubbles(): void {
    for (let i = 0; i < this.bubbleCount; i++) {
      const position = this.bubblePositions[i];
      position.y += this.bubbleSpeeds[i]; // Move bubble upwards

      // Reset bubble to bottom if it reaches the top
      if (position.y > this.maxHeight) {
        position.y = 0;
        position.x = randomFloat(-(this.maxWidth / 2), this.maxWidth / 2); // Randomize x position
        position.z = randomFloat(-(this.maxDepth / 2), this.maxDepth / 2); // Randomize z position
      }

      this.updateInstanceMatrix(i);
    }
  }

  /**
   * Animates the bubbles by updating their positions in a loop.
   */
  private animateBubbles(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      this.updateBubbles(); // Update bubble positions
    };
    animate();
  }
}
