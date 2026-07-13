import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { WoodPostGeometry, type WoodPostGeometryOptions } from "../../geometry/fence/WoodPostGeometry";

export interface WoodPostOptions extends WoodPostGeometryOptions {
  /** Wood tint. Defaults to `#e8e4da`. */
  color?: ColorRepresentation;
}

/**
 * Wooden fence post prefab — a square shaft under a cap board.
 */
export class WoodPost extends Mesh<WoodPostGeometry, MeshStandardMaterial> {
  readonly height: number;
  readonly totalHeight: number;

  constructor({ color = "#e8e4da", ...geometryOptions }: WoodPostOptions = {}) {
    const geometry = new WoodPostGeometry(geometryOptions);

    super(geometry, new MeshStandardMaterial({ color: new Color(color), flatShading: true }));

    this.height = geometry.height;
    this.totalHeight = geometry.totalHeight;
  }
}
