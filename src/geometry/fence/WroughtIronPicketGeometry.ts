import { BufferGeometry, ConeGeometry, CylinderGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface WroughtIronPicketGeometryOptions {
  /** Picket height, excluding the finial. Defaults to `2`. */
  height?: number;
  /** Picket radius. Defaults to `0.05`. */
  radius?: number;
  /** Finial height. Defaults to `0.3`. */
  finialHeight?: number;
  /** Finial base radius. Defaults to `0.075`. */
  finialRadius?: number;
  /** Finial depth scale on Z — flattens the spear point. Defaults to `1`. */
  finialScaleZ?: number;
  /**
   * Circumference segments. Defaults to `8` (round).
   *
   * Drop to `4` for square tubing, the way most wrought iron is actually made. The ring starts at a
   * half-segment offset so the flats face the viewer — without it, four segments would present a
   * corner and read as a diamond.
   */
  radialSegments?: number;
}

/**
 * Wrought-iron fence picket — a vertical bar topped with a spear-point finial.
 *
 * A picket is *infill*: many of them, evenly spaced between rails. It publishes no width profile,
 * because nothing attaches to it — that is a post's job.
 *
 * Local frame: base at Y=0.
 *
 * @example
 * ```ts
 * const geometry = new WroughtIronPicketGeometry({ height: 2, finialHeight: 0.3 });
 * const picket = new Mesh(geometry, ironMaterial);
 * scene.add(picket);
 * ```
 */
export class WroughtIronPicketGeometry extends BufferGeometry {
  /** Picket height, excluding the finial. */
  readonly height: number;
  readonly radius: number;
  readonly finialHeight: number;

  constructor({
    height = 2.0,
    radius = 0.05,
    finialHeight = 0.3,
    finialRadius = 0.075,
    finialScaleZ = 1.0,
    radialSegments = 8,
  }: WroughtIronPicketGeometryOptions = {}) {
    super();

    this.height = height;
    this.radius = radius;
    this.finialHeight = finialHeight;

    // Turn the cross-section a half-segment so its flats face the run rather than its corners.
    // At `radialSegments: 4` this is the difference between square tubing and a diamond.
    const thetaStart = Math.PI / radialSegments;

    const shaft = new CylinderGeometry(radius, radius, height, radialSegments, 1, false, thetaStart);
    shaft.translate(0, height / 2, 0);

    const finial = new ConeGeometry(finialRadius, finialHeight, radialSegments, 1, false, thetaStart);
    finial.translate(0, height + finialHeight / 2, 0);
    finial.scale(1, 1, finialScaleZ);

    this.copy(mergeGeometries([shaft, finial], false) as BufferGeometry);
  }

  /**
   * Nominal picket width — the diameter across, matching how tubing is specced (a ½" square tube is
   * ½" nominal). This is what a fence measures its gap against.
   */
  get width(): number {
    return this.radius * 2;
  }

  /** Overall height, finial included. */
  get totalHeight(): number {
    return this.height + this.finialHeight;
  }
}
