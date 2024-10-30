import { BufferGeometry, CylinderGeometry, SphereGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

class TestTubeGeometry extends BufferGeometry {
  constructor() {
    super();

    // Create the cylindrical body
    const tubeGeometry = new CylinderGeometry(0.2, 0.2, 3, 32, 1, true); // Radius top, radius bottom, height

    // Create the rounded bottom using a sphere
    const bottomGeometry = new SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); // Half sphere
    bottomGeometry.translate(0, -1.5, 0); // Position it at the bottom of the cylinder

    // Merge parts
    this.copy(mergeGeometries([tubeGeometry, bottomGeometry], true));
  }
}

export { TestTubeGeometry };
