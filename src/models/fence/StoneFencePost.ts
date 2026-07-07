import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  StoneFencePostGeometry,
  type StoneFencePostGeometryOptions,
} from "../../geometry/fence/StoneFencePostGeometry";

export interface StoneFencePostOptions extends StoneFencePostGeometryOptions {
  /** Stone tint. Defaults to `#8b7d7b`. */
  color?: ColorRepresentation;
}

/**
 * Stone fence post prefab.
 */
export class StoneFencePost extends Mesh<StoneFencePostGeometry, MeshStandardMaterial> {
  readonly height: number;

  constructor({ color = "#8b7d7b", ...geometryOptions }: StoneFencePostOptions = {}) {
    const geometry = new StoneFencePostGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({ color: new Color(color), flatShading: true }),
    );

    this.height = geometry.height;
  }
}