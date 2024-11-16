import {
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from "three";

/**
 * Bubbling class creates a group of small, semi-transparent bubbles that
 * rise upwards in a loop, mimicking bubbling inside a flask.
 */
class Bubbling extends Group {
  private bubbles: Mesh[] = [];
  private bubbleCount: number = 20;

  constructor() {
    super();

    // Bubble geometry and material
    const bubbleGeometry = new SphereGeometry(0.1, 6, 6); // Small spheres
    const bubbleMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.3,
      metalness: 0.3,
    });

    // Create bubbles and add to group
    for (let i = 0; i < this.bubbleCount; i++) {
      const bubble = new Mesh(bubbleGeometry, bubbleMaterial);
      bubble.position.set(
        (Math.random() - 0.5) * 1.5, // Random x position within flask
        Math.random() * 3, // Random y position within flask height
        (Math.random() - 0.5) * 1.5, // Random z position within flask
      );
      this.bubbles.push(bubble);
      this.add(bubble);
    }

    // Start the animation loop
    this.animateBubbles();
  }

  /**
   * Updates bubble positions, moving them upward and resetting them
   * to the bottom if they reach the top.
   */
  private updateBubbles(): void {
    this.bubbles.forEach((bubble) => {
      bubble.position.y += 0.02; // Move bubble upwards

      // Reset bubble to bottom if it reaches top
      if (bubble.position.y > 3) {
        bubble.position.y = 0;
        bubble.position.x = (Math.random() - 0.5) * 1.5; // Randomize x position again
        bubble.position.z = (Math.random() - 0.5) * 1.5; // Randomize z position again
      }
    });
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

export { Bubbling };
