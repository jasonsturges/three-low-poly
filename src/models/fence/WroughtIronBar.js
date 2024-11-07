import { Mesh, MeshStandardMaterial } from "three";
import { WroughtIronBarGeometry } from "../../geometry/fence/WroughtIronBarGeometry.js";

export class WroughtIronBar extends Mesh {
  constructor({
    barHeight = 2.0, //
    barRadius = 0.05,
    spikeHeight = 0.3,
    spikeRadius = 0.075, // barRadius * 1.5,
    radialSegments = 8,
  } = {}) {
    super();

    this.geometry = new WroughtIronBarGeometry({
      barHeight,
      barRadius,
      spikeHeight,
      spikeRadius,
      radialSegments,
    });
    this.material = new MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
  }
}
