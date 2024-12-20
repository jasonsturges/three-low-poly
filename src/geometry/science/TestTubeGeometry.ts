import { BufferGeometry, CylinderGeometry, SphereGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

class TestTubeGeometry extends BufferGeometry {
  constructor(radiusTop = 0.2, radiusBottom = 0.2, height = 3, segments = 32, openEnded = true) {
    super();

    // Create the cylindrical body
    const tubeGeometry = new CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, openEnded);

    // Create the rounded bottom using a half sphere
    const bottomGeometry = new SphereGeometry(radiusBottom, segments, segments / 2, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    bottomGeometry.translate(0, -(height / 2), 0); // Position it at the bottom of the cylinder

    // Merge parts
    this.copy(mergeBufferGeometries([tubeGeometry, bottomGeometry], false) as BufferGeometry);
  }
}

export { TestTubeGeometry };
