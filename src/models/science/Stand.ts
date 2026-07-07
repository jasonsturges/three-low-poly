import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { StandGeometry, type StandGeometryOptions } from "../../geometry/science/StandGeometry";

export interface StandOptions extends StandGeometryOptions {
  /** Metal tint. Defaults to `#888888`. */
  color?: ColorRepresentation;
}

/**
 * Laboratory stand prefab — ring and legs.
 */
export class Stand extends Mesh<StandGeometry, MeshStandardMaterial> {
  constructor({ color = "#888888", ...geometryOptions }: StandOptions = {}) {
    super(
      new StandGeometry(geometryOptions),
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 0.7,
        metalness: 0.3,
      }),
    );
  }
}