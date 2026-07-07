import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  WroughtIronBarGeometry,
  type WroughtIronBarGeometryOptions,
} from "../../geometry/fence/WroughtIronBarGeometry";

export interface WroughtIronBarOptions extends WroughtIronBarGeometryOptions {
  /** Iron tint. Defaults to `#333333`. */
  color?: ColorRepresentation;
}

/**
 * Wrought-iron fence post prefab.
 */
export class WroughtIronBar extends Mesh<WroughtIronBarGeometry, MeshStandardMaterial> {
  readonly barHeight: number;

  constructor({ color = "#333333", ...geometryOptions }: WroughtIronBarOptions = {}) {
    const geometry = new WroughtIronBarGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        metalness: 0.8,
        roughness: 0.4,
      }),
    );

    this.barHeight = geometry.barHeight;
  }
}