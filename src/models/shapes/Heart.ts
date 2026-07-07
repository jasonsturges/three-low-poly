import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { HeartGeometry, type HeartGeometryOptions } from "../../geometry/shapes/HeartGeometry";

export interface HeartOptions extends HeartGeometryOptions {
  /** Surface tint. Defaults to `#c62828`. */
  color?: ColorRepresentation;
  /** Emissive tint. Defaults to `#c61416`. */
  emissive?: ColorRepresentation;
  /** Emissive strength. Defaults to `0.25`. */
  emissiveIntensity?: number;
}

/**
 * Heart shape prefab.
 */
export class Heart extends Mesh<HeartGeometry, MeshStandardMaterial> {
  constructor({
    color = "#c62828",
    emissive = "#c61416",
    emissiveIntensity = 0.25,
    ...geometryOptions
  }: HeartOptions = {}) {
    super(
      new HeartGeometry(geometryOptions),
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