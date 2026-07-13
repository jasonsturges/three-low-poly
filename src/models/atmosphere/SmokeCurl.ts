import { Color, ColorRepresentation, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import {
  SmokeCurlGeometry,
  type SmokeCurlGeometryOptions,
} from "../../geometry/atmosphere/SmokeCurlGeometry";

export interface SmokeCurlOptions extends SmokeCurlGeometryOptions {
  /** Smoke tint. Defaults to `#cfd8e3`. */
  color?: ColorRepresentation;
  /** Defaults to `0.85`. */
  opacity?: number;
}

/**
 * Smoke curl prefab — a stylized rising trail.
 *
 * Rendered {@link DoubleSide} and translucent: the curl is uncapped and tapers to a point, so at the
 * tip you are looking through the tube at its own far wall.
 */
export class SmokeCurl extends Mesh<SmokeCurlGeometry, MeshStandardMaterial> {
  readonly height: number;

  constructor({ color = "#cfd8e3", opacity = 0.85, ...geometryOptions }: SmokeCurlOptions = {}) {
    const geometry = new SmokeCurlGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 1,
        flatShading: true,
        side: DoubleSide,
        transparent: true,
        opacity,
      }),
    );

    this.height = geometry.height;
  }
}
