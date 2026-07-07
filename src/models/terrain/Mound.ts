import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { MoundGeometry, type MoundGeometryOptions } from "../../geometry/terrain/MoundGeometry";
import { radiusFromCapWidth } from "../../utils/SphericalGeometryUtils";

export interface MoundOptions extends MoundGeometryOptions {
  /** Surface tint. Defaults to `#00ff00`. */
  color?: ColorRepresentation;
}

/**
 * Mound prefab — flat-topped terrain cap.
 */
export class Mound extends Mesh<MoundGeometry, MeshStandardMaterial> {
  readonly radius: number;

  constructor({
    color = "#00ff00",
    radius = radiusFromCapWidth(5, Math.PI / 10),
    ...geometryOptions
  }: MoundOptions = {}) {
    const geometry = new MoundGeometry({ radius, ...geometryOptions });

    super(
      geometry,
      new MeshStandardMaterial({ color: new Color(color), flatShading: true }),
    );

    this.radius = geometry.radius;
  }
}