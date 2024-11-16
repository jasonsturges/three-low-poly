import { BufferGeometry, SphereGeometry } from "three";
import { Direction } from "../../constants/Direction";
import { randomTransformVertices } from "../../utils/VertexUtils";

export class RockGeometry extends BufferGeometry {
  constructor(radius = 1, widthSegments = 4, heightSegments = 4) {
    super();

    const sphere = new SphereGeometry(radius, widthSegments, heightSegments);
    this.copy(randomTransformVertices(sphere, Direction.XYZ, 0.5, 1.0));
    this.computeVertexNormals();
    this.center();
  }
}
