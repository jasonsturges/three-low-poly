import { BoxGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial } from "three";
import { TestTubeGeometry } from "../../geometry/science/TestTubeGeometry";

class TestTubeRack extends Group {
  constructor(count = 3, colors = [0x00ffaa, 0xff00aa, 0xaa00ff]) {
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
    rack.castShadow = true;

    // Test tube properties
    const testTubeGeometry = new TestTubeGeometry(0.1, 0.1, 1, 16);
    const glassMaterial = new MeshStandardMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.5,
      depthWrite: false,
      side: DoubleSide,
    });

    // Create multiple test tubes with specified liquid colors
    for (let i = 0; i < count; i++) {
      // Test tube
      const testTube = new Mesh(testTubeGeometry, glassMaterial);
      const xPosition = (i - (count - 1) / 2) * 0.8;
      testTube.position.set(xPosition, 1, 0);
      testTube.castShadow = true;

      // Liquid geometry and material with unique color
      const liquidGeometry = new TestTubeGeometry(0.099, 0.099, 0.5, 16, false);
      const liquidColor = colors[i % colors.length]; // Cycle through colors if fewer than tubes
      const liquidMaterial = new MeshStandardMaterial({
        color: liquidColor,
        emissive: liquidColor,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.6,
      });

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
