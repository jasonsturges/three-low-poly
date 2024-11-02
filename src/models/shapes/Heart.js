import { ExtrudeGeometry, Mesh, MeshStandardMaterial } from "three";
import { HeartShape } from "../../shapes/HeartShape.js";

class Heart extends Mesh {
  constructor(size = 1, width = 1, height = 1, tipDepth = 10, depth = 0.25) {
    super();

    const shape = new HeartShape(size, width, height, tipDepth);
    const geometry = new ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: depth > 0,
      bevelThickness: 0,
      bevelSize: 0,
    });
    const material = new MeshStandardMaterial({
      color: 0xc62828,
      emissive: 0xc61416,
      emissiveIntensity: 0.25,
      metalness: 0.1,
      roughness: 0.3,
      flatShading: true,
    });

    geometry.center();
    this.geometry = geometry;
    this.material = material;
  }
}

export { Heart };
