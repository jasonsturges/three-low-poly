import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  WroughtIronPostGeometry,
  type WroughtIronPostGeometryOptions,
} from "../../geometry/fence/WroughtIronPostGeometry";

export interface WroughtIronPostOptions extends WroughtIronPostGeometryOptions {
  /** Iron tint. Defaults to `#333333`. */
  color?: ColorRepresentation;
}

/**
 * Wrought-iron fence post prefab — a slim shaft with a ball finial.
 */
export class WroughtIronPost extends Mesh<WroughtIronPostGeometry, MeshStandardMaterial> {
  readonly height: number;
  readonly totalHeight: number;

  constructor({ color = "#333333", ...geometryOptions }: WroughtIronPostOptions = {}) {
    const geometry = new WroughtIronPostGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        metalness: 0.8,
        roughness: 0.4,
        flatShading: true,
      }),
    );

    this.height = geometry.height;
    this.totalHeight = geometry.totalHeight;
  }
}
