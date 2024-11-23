import { Mesh, MeshStandardMaterial } from "three";
import { FlameGeometry } from "../../geometry/lighting/FlameGeometry";

export class Flame extends Mesh<FlameGeometry, MeshStandardMaterial> {
  constructor({ height = 0.25, radius = 0.05, segmentsU = 16, segmentsV = 16 } = {}) {
    super(
      new FlameGeometry({ segmentsU, segmentsV, height, radius }),
      new MeshStandardMaterial({ color: 0xffd700, emissive: 0xffa500, emissiveIntensity: 0.35 }),
    );
  }
}
