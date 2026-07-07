import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { StarGeometry, type StarGeometryOptions } from "../../geometry/shapes/StarGeometry";

export interface StarOptions extends StarGeometryOptions {
  /** Surface tint. Defaults to `#ffff00`. */
  color?: ColorRepresentation;
  /** Emissive tint. Defaults to `#ffd700`. */
  emissive?: ColorRepresentation;
  /** Emissive strength. Defaults to `0.25`. */
  emissiveIntensity?: number;
}

/**
 * Star shape prefab.
 */
export class Star extends Mesh<StarGeometry, MeshStandardMaterial> {
  constructor({
    color = "#ffff00",
    emissive = "#ffd700",
    emissiveIntensity = 0.25,
    ...geometryOptions
  }: StarOptions = {}) {
    super(
      new StarGeometry(geometryOptions),
      new MeshStandardMaterial({
        color: new Color(color),
        emissive: new Color(emissive),
        emissiveIntensity,
        metalness: 0.1,
        roughness: 0.3,
        flatShading: true,
      }),
    );
  }
}