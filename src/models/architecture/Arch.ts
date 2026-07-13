import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { ArchGeometry, type ArchGeometryOptions } from "../../geometry/architecture/ArchGeometry";

export interface ArchOptions extends ArchGeometryOptions {
  /** Surface tint. Defaults to `#9a9186`. */
  color?: ColorRepresentation;
}

/**
 * Archway prefab — a swept band you walk through.
 */
export class Arch extends Mesh<ArchGeometry, MeshStandardMaterial> {
  readonly totalHeight: number;

  constructor({ color = "#9a9186", ...geometryOptions }: ArchOptions = {}) {
    const geometry = new ArchGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({ color: new Color(color), roughness: 0.9, flatShading: true }),
    );

    this.totalHeight = geometry.totalHeight;
  }
}
