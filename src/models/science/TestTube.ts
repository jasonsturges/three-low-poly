import { DoubleSide, Mesh, MeshPhysicalMaterial } from "three";
import { TestTubeGeometry } from "../../geometry/science/TestTubeGeometry";

export class TestTube extends Mesh<TestTubeGeometry, MeshPhysicalMaterial> {
  constructor(radiusTop = 0.2, radiusBottom = 0.2, height = 3, segments = 32) {
    super(
      new TestTubeGeometry(radiusTop, radiusBottom, height, segments),
      new MeshPhysicalMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.1,
        reflectivity: 0.8,
        transmission: 0.9,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
  }
}
