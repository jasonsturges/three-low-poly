import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { HeartGeometry, type HeartGeometryOptions } from "../../geometry/shapes/HeartGeometry";

export interface HeartOptions extends HeartGeometryOptions {
  /** Surface tint. Defaults to `#e0392b` — bright card red, shared with {@link Diamond}. */
  color?: ColorRepresentation;
}

/**
 * Heart shape prefab — the card suit, sharing its material with {@link Spade}, {@link Club} and
 * {@link Diamond}: flat-shaded, lightly polished, no glow.
 */
export class Heart extends Mesh<HeartGeometry, MeshStandardMaterial> {
  constructor({ color = "#e0392b", ...geometryOptions }: HeartOptions = {}) {
    super(
      new HeartGeometry(geometryOptions),
      new MeshStandardMaterial({
        color: new Color(color),
        metalness: 0.1,
        roughness: 0.35,
        flatShading: true,
      }),
    );
  }
}
