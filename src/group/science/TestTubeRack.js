import { BoxGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial } from "three";
import { TestTubeGeometry } from "../../geometry/science/TestTubeGeometry.js";

class TestTubeRack extends Group {
  constructor() {
    super();

    // Rack geometry
    const rackGeometry = new BoxGeometry(3, 0.2, 1);
    const rackMaterial = new MeshStandardMaterial({
      color: 0x8b4513, // Wooden color or change to metallic tone
      roughness: 0.7,
      metalness: 0.3,
    });
    const rack = new Mesh(rackGeometry, rackMaterial);
    rack.position.y = 0.5;

    // Test tube properties
    const testTubeGeometry = new TestTubeGeometry(0.1, 0.1, 1, 16);
    const glassMaterial = new MeshStandardMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.5,
      side: DoubleSide,
    });

    // Liquid geometry and material
    const liquidGeometry = new TestTubeGeometry(0.099, 0.099, 0.5, 16, false);
    const liquidMaterial = new MeshStandardMaterial({
      color: 0x00ffaa, // Vibrant color for glowing effect
      emissive: 0x00ffaa,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.6,
    });

    // Create multiple test tubes with liquid
    for (let i = -1; i <= 1; i++) {
      // Test tube
      const testTube = new Mesh(testTubeGeometry, glassMaterial);
      testTube.position.set(i * 0.8, 1, 0);

      // Liquid inside test tube
      const liquid = new Mesh(liquidGeometry, liquidMaterial);
      liquid.position.set(0, -0.25, 0); // Position liquid inside tube
      testTube.add(liquid);

      // Add tube to rack
      rack.add(testTube);
    }

    // Group rack
    this.add(rack);
  }
}

export { TestTubeRack };
