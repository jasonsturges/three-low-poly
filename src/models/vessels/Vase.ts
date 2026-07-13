import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { VaseGeometry, type VaseGeometryOptions } from "../../geometry/vessels/VaseGeometry";

export interface VaseOptions extends VaseGeometryOptions {
  /** Glaze tint. Defaults to `#7fa8b8`. */
  color?: ColorRepresentation;
  /** Surface roughness. Defaults to `0.35`. */
  roughness?: number;
}

/**
 * Vase prefab — a lathed pot whose silhouette is authored from control points.
 */
export class Vase extends Mesh<VaseGeometry, MeshStandardMaterial> {
  readonly height: number;

  constructor({ color = "#7fa8b8", roughness = 0.35, ...geometryOptions }: VaseOptions = {}) {
    const geometry = new VaseGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        roughness,
        metalness: 0.05,
        flatShading: true,
      }),
    );

    this.height = geometry.height;
    this.castShadow = true;
    this.receiveShadow = true;
  }
}
