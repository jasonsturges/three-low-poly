import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { GearGeometry, type GearGeometryOptions } from "../../geometry/shapes/GearGeometry";

export interface GearOptions extends GearGeometryOptions {
  /** Metal tint. Defaults to `#aaaaaa`. */
  color?: ColorRepresentation;
}

/**
 * Gear shape prefab.
 */
export class Gear extends Mesh<GearGeometry, MeshStandardMaterial> {
  constructor({ color = "#aaaaaa", ...geometryOptions }: GearOptions = {}) {
    super(
      new GearGeometry(geometryOptions),
      new MeshStandardMaterial({
        color: new Color(color),
        metalness: 0.8,
        roughness: 0.2,
      }),
    );
  }
}