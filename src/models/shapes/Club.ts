import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { ClubGeometry, type ClubGeometryOptions } from "../../geometry/shapes/ClubGeometry";

export interface ClubOptions extends ClubGeometryOptions {
  /** Surface tint. Defaults to `#1c1c1c`. */
  color?: ColorRepresentation;
}

/**
 * Club shape prefab.
 */
export class Club extends Mesh<ClubGeometry, MeshStandardMaterial> {
  constructor({ color = "#1c1c1c", ...geometryOptions }: ClubOptions = {}) {
    super(
      new ClubGeometry(geometryOptions),
      new MeshStandardMaterial({
        color: new Color(color),
        metalness: 0.1,
        roughness: 0.35,
        flatShading: true,
      }),
    );
  }
}
