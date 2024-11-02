import { ExtrudeGeometry, Mesh, MeshStandardMaterial } from "three";
import { BurstShape } from "../../shapes/BurstShape.js";

class Burst extends Mesh {
  constructor(sides = 5, innerRadius = 0.5, outerRadius = 1.0, depth = 0.25) {
    super();

    const shape = new BurstShape(sides, innerRadius, outerRadius);
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

export { Burst };
