import { Color, ColorRepresentation, DoubleSide, Mesh, MeshPhysicalMaterial } from "three";
import {
  ErlenmeyerFlaskGeometry,
  type ErlenmeyerFlaskGeometryOptions,
} from "../../geometry/science/ErlenmeyerFlaskGeometry";

export interface ErlenmeyerFlaskOptions extends ErlenmeyerFlaskGeometryOptions {
  /** Glass tint. Defaults to `#88ccff`. */
  color?: ColorRepresentation;
  /** Glass opacity. Defaults to `0.4`. */
  opacity?: number;
}

/**
 * Erlenmeyer flask prefab — translucent glass vessel.
 */
export class ErlenmeyerFlask extends Mesh<ErlenmeyerFlaskGeometry, MeshPhysicalMaterial> {
  constructor({
    color = "#88ccff",
    opacity = 0.4,
    ...geometryOptions
  }: ErlenmeyerFlaskOptions = {}) {
    super(
      new ErlenmeyerFlaskGeometry(geometryOptions),
      new MeshPhysicalMaterial({
        color: new Color(color),
        transparent: true,
        opacity,
        roughness: 0.1,
        metalness: 0.1,
        reflectivity: 0.8,
        transmission: 0.9,
        side: DoubleSide,
      }),
    );
  }
}