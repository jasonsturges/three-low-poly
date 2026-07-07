import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  ObeliskHeadstoneGeometry,
  type ObeliskHeadstoneGeometryOptions,
} from "../../geometry/cemetery/ObeliskHeadstoneGeometry";

export interface ObeliskHeadstoneOptions extends ObeliskHeadstoneGeometryOptions {
  /** Stone tint. Defaults to `#777777`. */
  color?: ColorRepresentation;
  /** Surface roughness. Defaults to `0.8`. */
  roughness?: number;
}

/**
 * Obelisk headstone prefab.
 */
export class ObeliskHeadstone extends Mesh<ObeliskHeadstoneGeometry, MeshStandardMaterial> {
  readonly totalHeight: number;

  constructor({ color = "#777777", roughness = 0.8, ...geometryOptions }: ObeliskHeadstoneOptions = {}) {
    const geometry = new ObeliskHeadstoneGeometry(geometryOptions);

    super(geometry, new MeshStandardMaterial({ color: new Color(color), roughness }));

    this.totalHeight = geometry.totalHeight;
  }
}