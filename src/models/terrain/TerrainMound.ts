import { Color, ColorRepresentation, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import {
  TerrainMoundGeometry,
  type TerrainMoundGeometryOptions,
} from "../../geometry/terrain/TerrainMoundGeometry";

export interface TerrainMoundOptions extends TerrainMoundGeometryOptions {
  /** Surface tint. Defaults to `#3a5a3a`. */
  color?: ColorRepresentation;
  /** Faceted low-poly shading. Defaults to `true`. */
  flatShading?: boolean;
}

/**
 * Rounded terrain mound prefab — a {@link TerrainMoundGeometry} with a matte,
 * flat-shaded material. Base sits on Y=0; drop it into a scene as a diorama
 * ground or a small rise. Casts and receives shadows.
 */
export class TerrainMound extends Mesh<TerrainMoundGeometry, MeshStandardMaterial> {
  readonly radius: number;
  readonly height: number;

  constructor({ color = "#3a5a3a", flatShading = true, ...geometryOptions }: TerrainMoundOptions = {}) {
    const geometry = new TerrainMoundGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 1,
        metalness: 0,
        flatShading,
        side: DoubleSide,
      }),
    );

    this.radius = geometry.radius;
    this.height = geometry.height;
    this.castShadow = true;
    this.receiveShadow = true;
  }
}
