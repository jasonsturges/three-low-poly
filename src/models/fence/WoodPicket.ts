import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { WoodPicketGeometry, type WoodPicketGeometryOptions } from "../../geometry/fence/WoodPicketGeometry";

export interface WoodPicketOptions extends WoodPicketGeometryOptions {
  /** Wood tint. Defaults to `#e8e4da`. */
  color?: ColorRepresentation;
}

/**
 * Wooden fence picket prefab — a pointed plank.
 */
export class WoodPicket extends Mesh<WoodPicketGeometry, MeshStandardMaterial> {
  readonly height: number;
  readonly width: number;

  constructor({ color = "#e8e4da", ...geometryOptions }: WoodPicketOptions = {}) {
    const geometry = new WoodPicketGeometry(geometryOptions);

    super(geometry, new MeshStandardMaterial({ color: new Color(color), flatShading: true }));

    this.height = geometry.height;
    this.width = geometry.width;
  }
}
