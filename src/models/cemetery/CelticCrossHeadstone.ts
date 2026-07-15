import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  CelticCrossHeadstoneGeometry,
  type CelticCrossHeadstoneGeometryOptions,
} from "../../geometry/cemetery/CelticCrossHeadstoneGeometry";

export interface CelticCrossHeadstoneOptions extends CelticCrossHeadstoneGeometryOptions {
  /** Stone tint. Defaults to `#777777`. */
  color?: ColorRepresentation;
  /** Surface roughness. Defaults to `0.85`. */
  roughness?: number;
}

/**
 * Celtic cross headstone prefab — flared arms ringed by a nimbus. See {@link CelticCrossHeadstoneGeometry}.
 */
export class CelticCrossHeadstone extends Mesh<CelticCrossHeadstoneGeometry, MeshStandardMaterial> {
  readonly height: number;
  readonly span: number;

  constructor({ color = "#777777", roughness = 0.85, ...geometryOptions }: CelticCrossHeadstoneOptions = {}) {
    const geometry = new CelticCrossHeadstoneGeometry(geometryOptions);

    super(geometry, new MeshStandardMaterial({ color: new Color(color), roughness, flatShading: true }));

    this.height = geometry.height;
    this.span = geometry.span;
  }
}
