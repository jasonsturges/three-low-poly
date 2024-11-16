import { BufferGeometry, CylinderGeometry, TorusGeometry } from "three";
import {mergeBufferGeometries} from "three-stdlib";

export class StandGeometry extends BufferGeometry {
  constructor({
    radius = 0.3, //
    height = 0.4,
    count = 3,
    thickness = 0.03,
    radialSegments = 16,
  } = {}) {
    super();

    const ringGeometry = new TorusGeometry(radius, thickness, 8, radialSegments);
    ringGeometry.rotateX(Math.PI / 2);
    ringGeometry.translate(0, height, 0);

    const legGeometry = new CylinderGeometry(thickness * 0.6, thickness * 0.6, height, radialSegments);
    const legs = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const leg = legGeometry.clone();
      leg.translate(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
      legs.push(leg);
    }

    this.copy(mergeBufferGeometries([ringGeometry, ...legs], false) as BufferGeometry);
  }
}
