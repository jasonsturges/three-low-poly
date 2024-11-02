import { ExtrudeGeometry, Mesh, MeshStandardMaterial } from "three";
import { StarShape } from "../../shapes/StarShape.js";

/**
 * Star model.
 * @extends Mesh
 */
class Star extends Mesh {
  /**
   * Create a star shape.
   * @param {number} [points=5] - Number of points for the shape.
   * @param {number} [innerRadius=0.5] - Inner radius of the shape.
   * @param {number} [outerRadius=1.0] - Outer radius of the shape.
   * @param {ExtrudeSettings} [options={}] - Extrusion settings for customizing the shape.
   */
  constructor(points = 5, innerRadius = 0.5, outerRadius = 1.0, options = {}) {
    super();

    const shape = new StarShape(points, innerRadius, outerRadius);
    const geometry = new ExtrudeGeometry(shape, {
      steps: 0,
      depth: 0.25,
      bevelEnabled: false,
      bevelThickness: 0,
      bevelSize: 0,
      bevelOffset: 0,
      bevelSegments: 1,
      ...options,
    });
    const material = new MeshStandardMaterial({ color: 0x2194ce });

    geometry.center();
    this.geometry = geometry;
    this.material = material;
  }
}

export { Star };
