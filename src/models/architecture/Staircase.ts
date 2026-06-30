import { Color, ColorRepresentation, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import {
  StaircaseGeometry,
  type StaircaseGeometryOptions,
} from "../../geometry/architecture/StaircaseGeometry";

export interface StaircaseOptions extends StaircaseGeometryOptions {
  /** Tread and riser tint. Defaults to `#8b4513`. */
  color?: ColorRepresentation;
}

/**
 * Straight run staircase prefab — {@link StaircaseGeometry} with a wood-tone
 * default material.
 *
 * Local frame: centered on width, rises along +Y, runs along +Z.
 */
export class Staircase extends Mesh<StaircaseGeometry, MeshStandardMaterial> {
  readonly width: number;
  readonly riserHeight: number;
  readonly treadDepth: number;
  readonly stepCount: number;
  readonly totalHeight: number;
  readonly totalDepth: number;

  constructor({ color = "#8b4513", ...geometryOptions }: StaircaseOptions = {}) {
    const geometry = new StaircaseGeometry(geometryOptions);
    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 0.85,
        metalness: 0.04,
        // Open shell (no side stringers yet) — same as legacy staircase examples.
        side: DoubleSide,
      }),
    );

    this.width = geometry.width;
    this.riserHeight = geometry.riserHeight;
    this.treadDepth = geometry.treadDepth;
    this.stepCount = geometry.stepCount;
    this.totalHeight = geometry.totalHeight;
    this.totalDepth = geometry.totalDepth;
  }
}