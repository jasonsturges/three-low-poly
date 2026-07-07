import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { HexagonGeometry, type HexagonGeometryOptions } from "../../geometry/shapes/HexagonGeometry";

export interface HexagonOptions extends HexagonGeometryOptions {
  /** Surface tint. Defaults to `#ffffff`. */
  color?: ColorRepresentation;
  /** Emissive tint. Defaults to `#ffffff`. */
  emissive?: ColorRepresentation;
  /** Emissive strength. Defaults to `0.1`. */
  emissiveIntensity?: number;
}

/**
 * Hexagon tile prefab.
 */
export class Hexagon extends Mesh<HexagonGeometry, MeshStandardMaterial> {
  constructor({
    color = "#ffffff",
    emissive = "#ffffff",
    emissiveIntensity = 0.1,
    ...geometryOptions
  }: HexagonOptions = {}) {
    super(
      new HexagonGeometry(geometryOptions),
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