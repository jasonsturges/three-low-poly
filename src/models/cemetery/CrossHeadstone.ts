import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  CrossHeadstoneGeometry,
  type CrossHeadstoneGeometryOptions,
} from "../../geometry/cemetery/CrossHeadstoneGeometry";

export interface CrossHeadstoneOptions extends CrossHeadstoneGeometryOptions {
  /** Stone tint. Defaults to `#777777`. */
  color?: ColorRepresentation;
  /** Surface roughness. Defaults to `0.8`. */
  roughness?: number;
}

/**
 * Cross headstone prefab.
 */
export class CrossHeadstone extends Mesh<CrossHeadstoneGeometry, MeshStandardMaterial> {
  readonly width: number;
  readonly height: number;

  constructor({ color = "#777777", roughness = 0.8, ...geometryOptions }: CrossHeadstoneOptions = {}) {
    const geometry = new CrossHeadstoneGeometry(geometryOptions);

    super(geometry, new MeshStandardMaterial({ color: new Color(color), roughness }));

    this.width = geometry.width;
    this.height = geometry.height;
  }
}