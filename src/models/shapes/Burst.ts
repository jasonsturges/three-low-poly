import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { BurstGeometry, type BurstGeometryOptions } from "../../geometry/shapes/BurstGeometry";

export interface BurstOptions extends BurstGeometryOptions {
  /** Surface tint. Defaults to `#ffff00`. */
  color?: ColorRepresentation;
  /** Emissive tint. Defaults to `#ffd700`. */
  emissive?: ColorRepresentation;
  /** Emissive strength. Defaults to `0.25`. */
  emissiveIntensity?: number;
}

/**
 * Burst shape prefab.
 */
export class Burst extends Mesh<BurstGeometry, MeshStandardMaterial> {
  constructor({
    color = "#ffff00",
    emissive = "#ffd700",
    emissiveIntensity = 0.25,
    ...geometryOptions
  }: BurstOptions = {}) {
    super(
      new BurstGeometry(geometryOptions),
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