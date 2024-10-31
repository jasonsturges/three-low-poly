import { CatmullRomCurve3, Group, Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from "three";

class SpiralTube extends Group {
  constructor() {
    super();

    // Create a multi-spiral path for the tube
    const spiralLength = 100; // Total number of points for more coils
    const heightIncrement = 0.05; // Smaller increment to keep the coils tight
    const curve = new CatmullRomCurve3(
      Array.from({ length: spiralLength }, (_, i) => {
        const angle = i * 0.2; // Controls tightness of the spiral
        return new Vector3(
          Math.cos(angle) * 0.4,
          i * heightIncrement, // Gradual height increase
          Math.sin(angle) * 0.4,
        );
      }),
    );

    // Create tube geometry with a high segment count for smoothness
    const tubeGeometry = new TubeGeometry(curve, 200, 0.1, 8, false);
    const glassMaterial = new MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.2,
      emissive: 0x88ccff,
    });
    const multiSpiralTube = new Mesh(tubeGeometry, glassMaterial);
    this.add(multiSpiralTube);

    // Optional fluid animation inside tube (using gradient effect)
    function animateFluid() {
      glassMaterial.emissiveIntensity = 0.2 + Math.sin(Date.now() * 0.005) * 0.1;
    }

    // Main render loop with fluid animation
    function animate() {
      requestAnimationFrame(animate);
      animateFluid(); // Add subtle animation for fluid effect
    }

    animate();
  }
}

export { SpiralTube };
