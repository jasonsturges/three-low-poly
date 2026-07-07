import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { BoulderGeometry, type BoulderGeometryOptions } from "../../geometry/rocks/BoulderGeometry";

export interface BoulderOptions extends BoulderGeometryOptions {
  /** Stone tint. Defaults to `#6f6f6f`. */
  color?: ColorRepresentation;
  /** Faceted low-poly shading. Defaults to `true`. */
  flatShading?: boolean;
}

/**
 * Boulder prefab — a {@link BoulderGeometry} lumped by coherent 3D noise, with a
 * matte flat-shaded stone material. Centered on the origin; casts and receives
 * shadows. Vary `seed` per instance for a field of unique boulders.
 */
export class Boulder extends Mesh<BoulderGeometry, MeshStandardMaterial> {
  readonly radius: number;

  constructor({ color = "#6f6f6f", flatShading = true, ...geometryOptions }: BoulderOptions = {}) {
    const geometry = new BoulderGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 1,
        metalness: 0,
        flatShading,
      }),
    );

    this.radius = geometry.radius;
    this.castShadow = true;
    this.receiveShadow = true;
  }
}
