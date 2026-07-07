import { Color, ColorRepresentation, Mesh, MeshPhysicalMaterial } from "three";
import { WineBottleGeometry, type WineBottleGeometryOptions } from "../../geometry/bottles/WineBottleGeometry";

export interface WineBottleOptions extends WineBottleGeometryOptions {
  /** Glass tint. Defaults to `#556b2f`. */
  color?: ColorRepresentation;
}

/**
 * Wine bottle prefab — translucent green glass.
 */
export class WineBottle extends Mesh<WineBottleGeometry, MeshPhysicalMaterial> {
  constructor({ color = "#556b2f", ...geometryOptions }: WineBottleOptions = {}) {
    super(
      new WineBottleGeometry(geometryOptions),
      new MeshPhysicalMaterial({
        color: new Color(color),
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.2,
        metalness: 0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      }),
    );
  }
}