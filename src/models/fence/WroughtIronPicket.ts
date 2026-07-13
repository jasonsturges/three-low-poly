import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  WroughtIronPicketGeometry,
  type WroughtIronPicketGeometryOptions,
} from "../../geometry/fence/WroughtIronPicketGeometry";

export interface WroughtIronPicketOptions extends WroughtIronPicketGeometryOptions {
  /** Iron tint. Defaults to `#333333`. */
  color?: ColorRepresentation;
}

/**
 * Wrought-iron fence picket prefab — a bar with a spear-point finial.
 */
export class WroughtIronPicket extends Mesh<WroughtIronPicketGeometry, MeshStandardMaterial> {
  readonly height: number;
  readonly totalHeight: number;

  constructor({ color = "#333333", ...geometryOptions }: WroughtIronPicketOptions = {}) {
    const geometry = new WroughtIronPicketGeometry(geometryOptions);

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
