import { BufferGeometry, CylinderGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

class WineBottleGeometry extends BufferGeometry {
  constructor({ radius = 0.5, neckRadius = 0.2, height = 3, neckHeight = 1, segments = 16 } = {}) {
    super();

    // Main body
    const bodyHeight = height - neckHeight;
    const bodyGeometry = new CylinderGeometry(radius, radius, bodyHeight, segments);
    bodyGeometry.translate(0, bodyHeight / 2, 0);

    // Shoulder section between body and neck
    const shoulderHeight = 0.3;
    const shoulderGeometry = new CylinderGeometry(neckRadius, radius, shoulderHeight, segments);
    shoulderGeometry.translate(0, bodyHeight + shoulderHeight / 2, 0);

    // Neck
    const neckGeometry = new CylinderGeometry(neckRadius, neckRadius, neckHeight, segments);
    neckGeometry.translate(0, bodyHeight + shoulderHeight + neckHeight / 2, 0);

    // Merge geometries
    this.copy(mergeBufferGeometries([bodyGeometry, shoulderGeometry, neckGeometry], false) as BufferGeometry);
  }
}

export { WineBottleGeometry };
