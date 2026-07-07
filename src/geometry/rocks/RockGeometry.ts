import { BufferGeometry, SphereGeometry } from "three";
import { Axis } from "../../constants/Axis";
import { randomTransformVertices } from "../../utils/VertexUtils";

export interface RockGeometryOptions {
  /** Base sphere radius before vertex noise. Defaults to `1`. */
  radius?: number;
  /** Horizontal segments. Defaults to `4`. */
  widthSegments?: number;
  /** Vertical segments. Defaults to `4`. */
  heightSegments?: number;
}

/**
 * Low-poly rock — sphere with randomized vertex offsets, then centered.
 */
export class RockGeometry extends BufferGeometry {
  readonly radius: number;
  readonly widthSegments: number;
  readonly heightSegments: number;

  constructor({
    radius = 1,
    widthSegments = 4,
    heightSegments = 4,
  }: RockGeometryOptions = {}) {
    super();

    this.radius = radius;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;

    const sphere = new SphereGeometry(radius, widthSegments, heightSegments);
    this.copy(randomTransformVertices(sphere, Axis.XYZ, 0.5, 1.0));
    this.computeVertexNormals();
    this.center();
  }
}