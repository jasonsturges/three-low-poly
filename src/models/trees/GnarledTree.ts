import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  GnarledTreeGeometry,
  type GnarledTreeGeometryOptions,
} from "../../geometry/trees/GnarledTreeGeometry";

export interface GnarledTreeOptions extends GnarledTreeGeometryOptions {
  /** Bark tint. Defaults to `#2b2620`. */
  color?: ColorRepresentation;
}

/**
 * Gnarled, leafless tree prefab — the kind that belongs in a graveyard.
 */
export class GnarledTree extends Mesh<GnarledTreeGeometry, MeshStandardMaterial> {
  constructor({ color = "#2b2620", ...geometryOptions }: GnarledTreeOptions = {}) {
    super(
      new GnarledTreeGeometry(geometryOptions),
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 1,
        metalness: 0,
        flatShading: true,
      }),
    );

    this.castShadow = true;
    this.receiveShadow = true;
  }
}
