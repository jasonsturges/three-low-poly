import { Mesh, MeshStandardMaterial } from "three";
import { StandGeometry } from "../../geometry/science/StandGeometry";

export class Stand extends Mesh<StandGeometry, MeshStandardMaterial> {
  constructor({
    radius = 0.3, //
    height = 0.4,
    count = 3,
    thickness = 0.03,
    radialSegments = 16,
  } = {}) {
    super(
      new StandGeometry({ radius, height, count, thickness, radialSegments }),
      new MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.7,
        metalness: 0.3,
      }),
    );
  }
}
