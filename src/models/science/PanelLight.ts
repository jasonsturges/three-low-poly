import { Mesh, MeshStandardMaterial, SphereGeometry } from "three";

export interface PanelLightOptions {
  radius?: number;
  color?: number;
  emissive?: number;
  emissiveIntensity?: number;
}

/**
 * Prefab for a panel light.
 * Designed to appear as a LED light
 */
export class PanelLight extends Mesh {
  public geometry: SphereGeometry;
  public material: MeshStandardMaterial;

  constructor({
    radius = 0.15, //
    color = 0xffc7c7,
    emissive = 0xff0000,
    emissiveIntensity = 0.5,
  }: PanelLightOptions = {}) {
    super();

    this.geometry = new SphereGeometry(radius, 8, 8);
    this.material = new MeshStandardMaterial({
      color: color,
      emissive: emissive,
      emissiveIntensity: emissiveIntensity,
    });
  }
}
