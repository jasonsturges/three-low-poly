import { Mesh, MeshStandardMaterial } from "three";
import { WroughtIronFenceGeometry } from "../../geometry/fence/WroughtIronFenceGeometry";

export class WroughtIronFence extends Mesh<WroughtIronFenceGeometry, MeshStandardMaterial> {
  constructor({
    count = 20, //
    spacing = 0.4,
    barHeight = 2.0,
    barRadius = 0.05,
    spikeHeight = 0.3,
    spikeRadius = 0.075,
    spikeScaleZ = 1.0,
    railHeight = 0.1,
    railDepth = 0.05,
    railOffset = 0.0,
    radialSegments = 8,
  } = {}) {
    super(
      new WroughtIronFenceGeometry({
        count,
        spacing,
        barHeight,
        barRadius,
        spikeHeight,
        spikeRadius,
        spikeScaleZ,
        railHeight,
        railDepth,
        railOffset,
        radialSegments,
      }),
      new MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 }),
    );
  }
}
