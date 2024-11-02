import { ExtrudeGeometry, Mesh, MeshStandardMaterial } from "three";
import { GearShape } from "../../shapes/GearShape.js";

/**
 * Gear model.
 * @extends Mesh
 */
class Gear extends Mesh {
  /**
   * Create a gear shape.
   * @param {number} [sides=5] - Number of sides for the gear.
   * @param {number} [innerRadius=80] - Inner radius of the gear.
   * @param {number} [outerRadius=4] - Outer radius of the gear.
   * @param {number} [holeSides=2] - Number of sides for the hole in the gear.
   * @param {number} [holeRadius=0] - Radius of the hole in the gear.
   * @param {ExtrudeSettings} [options={}] - Extrusion settings for customizing the shape.
   */
  constructor(sides = 5, innerRadius = 0.5, outerRadius = 1, holeSides = 5, holeRadius = 0.25, options = {}) {
    super();

    const shape = new GearShape(sides, innerRadius, outerRadius, holeSides, holeRadius);
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

export { Gear };
