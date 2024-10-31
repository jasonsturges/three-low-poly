import {Group, Mesh, MeshStandardMaterial, SphereGeometry} from "three";

class Bubbling extends Group {
  constructor() {
    super();

    // Bubble properties
    const bubbles = [];
    const bubbleCount = 20; // Number of bubbles

    // Create bubble geometry and material
    const bubbleGeometry = new SphereGeometry(0.1, 6, 6); // Small spheres
    const bubbleMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.3,
      metalness: 0.3,
    });

    for (let i = 0; i < bubbleCount; i++) {
      const bubble = new Mesh(bubbleGeometry, bubbleMaterial);
      bubble.position.set(
        (Math.random() - 0.5) * 1.5, // Random x position within flask
        Math.random() * 3, // Random y position within flask height
        (Math.random() - 0.5) * 1.5, // Random z position within flask
      );
      bubbles.push(bubble);
      this.add(bubble);
    }

    // Bubble animation loop
    function animateBubbles() {
      bubbles.forEach((bubble) => {
        bubble.position.y += 0.02; // Move bubble upwards

        // Reset bubble to bottom if it reaches top
        if (bubble.position.y > 3) {
          bubble.position.y = 0;
          bubble.position.x = (Math.random() - 0.5) * 1.5; // Randomize x position again
          bubble.position.z = (Math.random() - 0.5) * 1.5; // Randomize z position again
        }
      });
    }

    // Add animateBubbles to the main render loop
    function animate() {
      requestAnimationFrame(animate);
      animateBubbles(); // Update bubble positions
    }

    animate();
  }
}

export { Bubbling };
