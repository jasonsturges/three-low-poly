import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { ObeliskGeometry, type ObeliskGeometryOptions } from "../../geometry/cemetery/ObeliskGeometry";

export interface ObeliskOptions extends ObeliskGeometryOptions {
  /** Stone tint. Defaults to `#777777`. */
  color?: ColorRepresentation;
  /** Surface roughness. Defaults to `0.8`. */
  roughness?: number;
}

/**
 * Obelisk monument prefab — a tapered shaft under a pyramidion.
 */
export class Obelisk extends Mesh<ObeliskGeometry, MeshStandardMaterial> {
  readonly totalHeight: number;

  constructor({ color = "#777777", roughness = 0.8, ...geometryOptions }: ObeliskOptions = {}) {
    const geometry = new ObeliskGeometry(geometryOptions);

    super(geometry, new MeshStandardMaterial({ color: new Color(color), roughness, flatShading: true }));

    this.totalHeight = geometry.totalHeight;
    this.castShadow = true;
    this.receiveShadow = true;
  }
}
