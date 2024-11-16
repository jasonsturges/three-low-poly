import { BufferGeometry, CylinderGeometry, SphereGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

export class BeakerGeometry extends BufferGeometry {
  constructor() {
    super();

    // Create the sphere part of the glassware
    const sphereGeometry = new SphereGeometry(1, 16, 16);
    const tubeGeometry = new CylinderGeometry(0.2, 0.2, 2, 16, 1, true);

    // Adjust tube position to stick out of the sphere
    tubeGeometry.translate(0, 1.5, 0);
    tubeGeometry.rotateX(Math.PI / 2);

    this.copy(mergeBufferGeometries([sphereGeometry, tubeGeometry], false) as BufferGeometry);
  }
}
