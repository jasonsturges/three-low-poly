import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { DiamondGeometry, type DiamondGeometryOptions } from "../../geometry/shapes/DiamondGeometry";

export interface DiamondOptions extends DiamondGeometryOptions {
  /** Surface tint. Defaults to `#e0392b` — bright card red, shared with {@link Heart}. */
  color?: ColorRepresentation;
}

/**
 * Diamond shape prefab — the card suit. See {@link DiamondGeometry}.
 */
export class Diamond extends Mesh<DiamondGeometry, MeshStandardMaterial> {
  constructor({ color = "#e0392b", ...geometryOptions }: DiamondOptions = {}) {
    super(
      new DiamondGeometry(geometryOptions),
      new MeshStandardMaterial({
        color: new Color(color),
        metalness: 0.1,
        roughness: 0.35,
        flatShading: true,
      }),
    );
  }
}
