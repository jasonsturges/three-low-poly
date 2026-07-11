import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { PolygonGeometry, type PolygonGeometryOptions } from "../../geometry/shapes/PolygonGeometry";

export interface PolygonOptions extends PolygonGeometryOptions {
  /** Surface tint. Defaults to `#ffffff`. */
  color?: ColorRepresentation;
  /** Emissive tint. Defaults to `#ffffff`. */
  emissive?: ColorRepresentation;
  /** Emissive strength. Defaults to `0.1`. */
  emissiveIntensity?: number;
}

/**
 * Regular n-gon tile prefab.
 */
export class Polygon extends Mesh<PolygonGeometry, MeshStandardMaterial> {
  constructor({
    color = "#ffffff",
    emissive = "#ffffff",
    emissiveIntensity = 0.1,
    ...geometryOptions
  }: PolygonOptions = {}) {
    super(
      new PolygonGeometry(geometryOptions),
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
