import { Mesh, MeshStandardMaterial } from "three";
import { WroughtIronBarGeometry } from "../../geometry/fence/WroughtIronBarGeometry";

export class WroughtIronBar extends Mesh<WroughtIronBarGeometry, MeshStandardMaterial> {
  constructor({
    barHeight = 2.0, //
    barRadius = 0.05,
    spikeHeight = 0.3,
    spikeRadius = 0.075,
    spikeScaleZ = 1.0,
    radialSegments = 8,
  } = {}) {
    super(
      new WroughtIronBarGeometry({
        barHeight,
        barRadius,
        spikeHeight,
        spikeRadius,
        spikeScaleZ,
        radialSegments,
      }),
      new MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 }),
    );
  }
}
