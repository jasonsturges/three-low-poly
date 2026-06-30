import { Color, ColorRepresentation, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import {
  SpiralStaircaseGeometry,
  type SpiralStaircaseGeometryOptions,
} from "../../geometry/architecture/SpiralStaircaseGeometry";

export interface SpiralStaircaseOptions extends SpiralStaircaseGeometryOptions {
  /** Tread and riser tint. Defaults to `#8b4513`. */
  color?: ColorRepresentation;
}

/**
 * Turret-style spiral staircase prefab — wraps {@link SpiralStaircaseGeometry}.
 */
export class SpiralStaircase extends Mesh<SpiralStaircaseGeometry, MeshStandardMaterial> {
  readonly innerRadius: number;
  readonly width: number;
  readonly outerRadius: number;
  readonly treadDepth: number;
  readonly riserHeight: number;
  readonly stepCount: number;
  readonly stepAngle: number;
  readonly totalHeight: number;
  readonly totalTurn: number;

  constructor({ color = "#8b4513", ...geometryOptions }: SpiralStaircaseOptions = {}) {
    const geometry = new SpiralStaircaseGeometry(geometryOptions);
    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 0.85,
        metalness: 0.04,
        side: DoubleSide,
      }),
    );

    this.innerRadius = geometry.innerRadius;
    this.width = geometry.width;
    this.outerRadius = geometry.outerRadius;
    this.treadDepth = geometry.treadDepth;
    this.riserHeight = geometry.riserHeight;
    this.stepCount = geometry.stepCount;
    this.stepAngle = geometry.stepAngle;
    this.totalHeight = geometry.totalHeight;
    this.totalTurn = geometry.totalTurn;
  }
}