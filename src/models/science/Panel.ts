import { BoxGeometry, Mesh, MeshStandardMaterial } from "three";

export interface PanelOptions {
  width?: number;
  height?: number;
  depth?: number;
}

/**
 * Prefab for a panel.
 * Designed to be used as a control panel for switches, lights, levels, dials, and gauges.
 */
export class Panel extends Mesh {
  public geometry: BoxGeometry;
  public material: MeshStandardMaterial;

  constructor({ width = 3, height = 4, depth = 0.1 }: PanelOptions = {}) {
    super();

    this.geometry = new BoxGeometry(width, height, depth);
    this.material = new MeshStandardMaterial({
      color: 0x2e2e2e,
      roughness: 0.8,
      metalness: 0.6,
    });
  }
}
