import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  WroughtIronFenceGeometry,
  type WroughtIronFenceGeometryOptions,
} from "../../geometry/fence/WroughtIronFenceGeometry";

export interface WroughtIronFenceOptions extends WroughtIronFenceGeometryOptions {
  /** Iron tint. Defaults to `#333333`. */
  color?: ColorRepresentation;
}

/**
 * Wrought-iron fence run prefab.
 */
export class WroughtIronFence extends Mesh<WroughtIronFenceGeometry, MeshStandardMaterial> {
  readonly count: number;

  constructor({ color = "#333333", ...geometryOptions }: WroughtIronFenceOptions = {}) {
    const geometry = new WroughtIronFenceGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        metalness: 0.8,
        roughness: 0.4,
      }),
    );

    this.count = geometry.count;
  }
}