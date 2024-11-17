import { DoubleSide, Group, Mesh, MeshPhysicalMaterial } from "three";
import { TestTubeGeometry } from "../../geometry/science/TestTubeGeometry";

class TestTube extends Group {
  constructor(radiusTop = 0.2, radiusBottom = 0.2, height = 3, segments = 32) {
    super();

    // Test Tube Geometry
    const tubeGeometry = new TestTubeGeometry(radiusTop, radiusBottom, height, segments);

    const tubeMaterial = new MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
      reflectivity: 0.8,
      transmission: 0.9, // For glass effect
      depthWrite: false,
      side: DoubleSide,
    });

    const tube = new Mesh(tubeGeometry, tubeMaterial);

    this.add(tube);
  }
}

export { TestTube };
