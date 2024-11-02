import { ExtrudeGeometry, Mesh, MeshStandardMaterial } from "three";
import { GearShape } from "../../shapes/GearShape.js";

class Gear extends Mesh {
  constructor(sides = 5, innerRadius = 0.5, outerRadius = 1, holeSides = 5, holeRadius = 0.25, depth = 0.25) {
    super();

    const shape = new GearShape(sides, innerRadius, outerRadius, holeSides, holeRadius);
    const geometry = new ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: depth > 0,
      bevelThickness: 0,
      bevelSize: 0,
    });
    const material = new MeshStandardMaterial({ color: 0x2194ce });

    geometry.center();
    this.geometry = geometry;
    this.material = material;
  }
}

export { Gear };
