import { BufferGeometry, ConeGeometry, CylinderGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Wrought Iron Bar Geometry, a simple wrought iron bar shape
 * @extends BufferGeometry
 *
 * @example
 * // Create a wrought iron bar
 * const barGeometry = new WroughtIronBarGeometry();
 * const barMaterial = new MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
 * const bar = new Mesh(barGeometry, barMaterial);
 * scene.add(bar);
 */
class WroughtIronBarGeometry extends BufferGeometry {
  constructor(barHeight = 2.0, barRadius = 0.05, spikeHeight = 0.3) {
    super();

    // Create a cylinder for the vertical bar
    const barGeometry = new CylinderGeometry(barRadius, barRadius, barHeight, 8);
    barGeometry.translate(0, barHeight / 2, 0); // Shift up to stand on the ground

    // Create a cone for the spike on top
    const spikeGeometry = new ConeGeometry(barRadius * 1.5, spikeHeight, 8);
    spikeGeometry.translate(0, barHeight + spikeHeight / 2, 0); // Place on top of the bar

    // Merge bar and spike into one geometry
    this.copy(mergeGeometries([barGeometry, spikeGeometry], true));
  }
}

export { WroughtIronBarGeometry };
