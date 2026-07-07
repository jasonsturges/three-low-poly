import { Color, ColorRepresentation, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import {
  TerrainPlaneGeometry,
  type TerrainPlaneGeometryOptions,
} from "../../geometry/terrain/TerrainPlaneGeometry";

export interface TerrainPlaneOptions extends TerrainPlaneGeometryOptions {
  /** Surface tint. Defaults to `#3a5a3a`. */
  color?: ColorRepresentation;
  /** Faceted low-poly shading. Defaults to `true`. */
  flatShading?: boolean;
}

/**
 * Rectangular terrain patch prefab — a {@link TerrainPlaneGeometry} with a matte,
 * flat-shaded material. Base grid on Y=0; drop it into a scene as a diorama ground
 * or a tileable terrain field. Casts and receives shadows.
 */
export class TerrainPlane extends Mesh<TerrainPlaneGeometry, MeshStandardMaterial> {
  readonly width: number;
  readonly depth: number;

  constructor({ color = "#3a5a3a", flatShading = true, ...geometryOptions }: TerrainPlaneOptions = {}) {
    const geometry = new TerrainPlaneGeometry(geometryOptions);

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

    this.width = geometry.width;
    this.depth = geometry.depth;
    this.castShadow = true;
    this.receiveShadow = true;
  }
}
