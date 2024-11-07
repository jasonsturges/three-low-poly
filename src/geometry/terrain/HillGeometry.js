import { BufferGeometry, SphereGeometry } from "three";

export class HillGeometry extends BufferGeometry {
  constructor({
    radius = 3, //
    height = 0.6,
    widthSegments = 64,
    heightSegments = 16,
    phiStart = 0,
    phiLength = Math.PI * 2,
  } = {}) {
    super();

    this.copy(new SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, 0, Math.PI / 2));
    this.scale(1, height / radius, 1);
  }
}
