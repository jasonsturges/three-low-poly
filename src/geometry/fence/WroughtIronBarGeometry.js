import { BufferGeometry, ConeGeometry, CylinderGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Wrought Iron Bar Geometry, a simple wrought iron bar shape
 */
export class WroughtIronBarGeometry extends BufferGeometry {
  constructor({
    barHeight = 2.0, //
    barRadius = 0.05,
    spikeHeight = 0.3,
    spikeRadius = 0.075, // barRadius * 1.5,
    radialSegments = 8,
  } = {}) {
    super();

    // Create a cylinder for the vertical bar
    const barGeometry = new CylinderGeometry(barRadius, barRadius, barHeight, radialSegments);
    barGeometry.translate(0, barHeight / 2, 0);

    // Create a cone for the spike on top
    const spikeGeometry = new ConeGeometry(spikeRadius, spikeHeight, radialSegments);
    spikeGeometry.translate(0, barHeight + spikeHeight / 2, 0);

    // Merge bar and spike into one geometry
    this.copy(mergeGeometries([barGeometry, spikeGeometry], false));
  }
}
