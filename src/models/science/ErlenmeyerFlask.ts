import { ErlenmeyerFlaskGeometry } from "../../geometry/science/ErlenmeyerFlaskGeometry";
import { DoubleSide, Mesh, MeshPhysicalMaterial } from "three";

export class ErlenmeyerFlask extends Mesh<ErlenmeyerFlaskGeometry, MeshPhysicalMaterial> {
  constructor({
    flaskRadius = 1, //
    neckRadius = 0.3,
    height = 2.5,
    neckHeight = 1,
    radialSegments = 16,
  } = {}) {
    super(
      new ErlenmeyerFlaskGeometry({ flaskRadius, neckRadius, height, neckHeight, radialSegments }),
      new MeshPhysicalMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.1,
        reflectivity: 0.8,
        transmission: 0.9,
        side: DoubleSide,
        wireframe: false,
      }),
    );
  }
}
