import { Color, ColorRepresentation, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import {
  LShapedStaircaseGeometry,
  type LShapedStaircaseGeometryOptions,
} from "../../geometry/architecture/LShapedStaircaseGeometry";

export interface LShapedStaircaseOptions extends LShapedStaircaseGeometryOptions {
  /** Tread and riser tint. Defaults to `#8b4513`. */
  color?: ColorRepresentation;
}

/**
 * L-shaped staircase prefab — two flights with a square width × width landing.
 */
export class LShapedStaircase extends Mesh<LShapedStaircaseGeometry, MeshStandardMaterial> {
  readonly width: number;
  readonly riserHeight: number;
  readonly treadDepth: number;
  readonly stepsPerFlight: number;
  readonly landingSize: number;
  readonly flightRun: number;
  readonly totalHeight: number;

  constructor({ color = "#8b4513", ...geometryOptions }: LShapedStaircaseOptions = {}) {
    const geometry = new LShapedStaircaseGeometry(geometryOptions);
    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 0.85,
        metalness: 0.04,
        side: DoubleSide,
      }),
    );

    this.width = geometry.width;
    this.riserHeight = geometry.riserHeight;
    this.treadDepth = geometry.treadDepth;
    this.stepsPerFlight = geometry.stepsPerFlight;
    this.landingSize = geometry.landingSize;
    this.flightRun = geometry.flightRun;
    this.totalHeight = geometry.totalHeight;
  }
}