import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { HillGeometry, type HillGeometryOptions } from "../../geometry/terrain/HillGeometry";

export interface HillOptions extends HillGeometryOptions {
  /** Surface tint. Defaults to `#00ff00`. */
  color?: ColorRepresentation;
}

/**
 * Hill prefab — hemispherical terrain mound.
 */
export class Hill extends Mesh<HillGeometry, MeshStandardMaterial> {
  readonly radius: number;
  readonly height: number;

  constructor({ color = "#00ff00", ...geometryOptions }: HillOptions = {}) {
    const geometry = new HillGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({ color: new Color(color), flatShading: true }),
    );

    this.radius = geometry.radius;
    this.height = geometry.height;
  }
}