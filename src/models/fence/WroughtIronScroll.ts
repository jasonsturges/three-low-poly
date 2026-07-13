import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  WroughtIronScrollGeometry,
  type WroughtIronScrollGeometryOptions,
} from "../../geometry/fence/WroughtIronScrollGeometry";

export interface WroughtIronScrollOptions extends WroughtIronScrollGeometryOptions {
  /** Iron tint. Defaults to `#2b2b2b`. */
  color?: ColorRepresentation;
}

/**
 * Wrought-iron scroll prefab — the decorative curl of a gate or a fence panel.
 */
export class WroughtIronScroll extends Mesh<WroughtIronScrollGeometry, MeshStandardMaterial> {
  constructor({ color = "#2b2b2b", ...geometryOptions }: WroughtIronScrollOptions = {}) {
    super(
      new WroughtIronScrollGeometry(geometryOptions),
      new MeshStandardMaterial({
        color: new Color(color),
        metalness: 0.8,
        roughness: 0.45,
        flatShading: true,
      }),
    );
  }
}
