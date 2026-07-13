import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { SpadeGeometry, type SpadeGeometryOptions } from "../../geometry/shapes/SpadeGeometry";

export interface SpadeOptions extends SpadeGeometryOptions {
  /** Surface tint. Defaults to `#1c1c1c`. */
  color?: ColorRepresentation;
}

/**
 * Spade shape prefab.
 */
export class Spade extends Mesh<SpadeGeometry, MeshStandardMaterial> {
  constructor({ color = "#1c1c1c", ...geometryOptions }: SpadeOptions = {}) {
    super(
      new SpadeGeometry(geometryOptions),
      new MeshStandardMaterial({
        color: new Color(color),
        metalness: 0.1,
        roughness: 0.35,
        flatShading: true,
      }),
    );
  }
}
