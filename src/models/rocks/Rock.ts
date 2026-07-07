import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { RockGeometry, type RockGeometryOptions } from "../../geometry/rocks/RockGeometry";

export interface RockOptions extends RockGeometryOptions {
  /** Stone tint. Defaults to `#808080`. */
  color?: ColorRepresentation;
}

/**
 * Single rock prefab — noisy sphere mesh.
 */
export class Rock extends Mesh<RockGeometry, MeshStandardMaterial> {
  constructor({ color = "#808080", ...geometryOptions }: RockOptions = {}) {
    super(
      new RockGeometry(geometryOptions),
      new MeshStandardMaterial({ color: new Color(color), flatShading: true }),
    );
  }
}