import { BoxGeometry, BufferGeometry } from "three";
import { WroughtIronBarGeometry } from "./WroughtIronBarGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export class WroughtIronFenceGeometry extends BufferGeometry {
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
  } = {}) {
    super();

    const geometries = [];
    const bar = new WroughtIronBarGeometry({ barHeight, barRadius, spikeHeight, spikeRadius, spikeScaleZ });
    const rail = new BoxGeometry(count * spacing, railHeight, railDepth);

    for (let i = 0; i < count; i++) {
      const geometry = bar.clone();
      geometry.translate(i * spacing, 0, 0);
      geometries.push(geometry);
    }

    const topRail = rail.clone();
    topRail.translate((spacing * (count - 1)) / 2, barHeight - railOffset - railHeight / 2, 0);
    geometries.push(topRail);

    const bottomRail = rail.clone();
    bottomRail.translate((spacing * (count - 1)) / 2, railHeight / 2, 0);
    geometries.push(bottomRail);

    this.copy(mergeGeometries(geometries));
  }
}
