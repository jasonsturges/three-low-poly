import { BoxGeometry, BufferGeometry, CylinderGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

export interface WallSconceGeometryOptions {
  /** Wall-plate thickness (X). Defaults to `0.05`. */
  plateThickness?: number;
  /** Wall-plate height (Y). Defaults to `0.22`. */
  plateHeight?: number;
  /** Wall-plate depth (Z). Defaults to `0.28`. */
  plateDepth?: number;
  /** Wall-plate center X (negative = into the wall). Defaults to `-0.055`. */
  plateOffsetX?: number;
  /** Bracket length into the room (X). Defaults to `0.1`. */
  bracketLength?: number;
  /** Bracket height (Y). Defaults to `0.05`. */
  bracketHeight?: number;
  /** Bracket depth (Z). Defaults to `0.07`. */
  bracketDepth?: number;
  /** Bracket center X. Defaults to `-0.005`. */
  bracketOffsetX?: number;
  /** Bracket center Y. Defaults to `0.1`. */
  bracketOffsetY?: number;
  /** Chimney / lamp body center X. Defaults to `0.06`. */
  bodyOffsetX?: number;
  /** Chimney height. Defaults to `0.3`. */
  chimneyHeight?: number;
  /** Chimney top radius. Defaults to `0.1`. */
  chimneyTopRadius?: number;
  /** Chimney bottom radius. Defaults to `0.105`. */
  chimneyBottomRadius?: number;
  /** Chimney center Y. Defaults to `-0.05`. */
  chimneyCenterY?: number;
  /** Cap radius. Defaults to `0.115`. */
  capRadius?: number;
  /** Cap height. Defaults to `0.05`. */
  capHeight?: number;
  /** Cap center Y. Defaults to `0.12`. */
  capCenterY?: number;
  /** Bowl top radius. Defaults to `0.09`. */
  bowlTopRadius?: number;
  /** Bowl bottom radius. Defaults to `0.11`. */
  bowlBottomRadius?: number;
  /** Bowl height. Defaults to `0.05`. */
  bowlHeight?: number;
  /** Bowl center Y. Defaults to `-0.22`. */
  bowlCenterY?: number;
  /** Radial segments on cylinders. Defaults to `8`. */
  radialSegments?: number;
  /** Glass chimney scale relative to the frame opening. Defaults to `0.96`. */
  innerScale?: number;
  /** Include the emissive glass chimney. Defaults to `true`. */
  inner?: boolean;
}

/**
 * Wall-mounted oil-lamp sconce — iron mount, cap, and bowl framing an emissive
 * glass chimney.
 *
 * Material groups: `0` mount (plate + bracket), `1` iron frame (cap + bowl),
 * `2` glass chimney.
 *
 * Local frame: faces +X from a −X wall; lamp center at
 * `(bodyOffsetX, chimneyCenterY, 0)`.
 */
export class WallSconceGeometry extends BufferGeometry {
  readonly bodyOffsetX: number;
  readonly chimneyCenterY: number;
  readonly innerScale: number;
  readonly inner: boolean;
  readonly lightCenterX: number;
  readonly lightCenterY: number;
  readonly lightCenterZ: number;

  constructor({
    plateThickness = 0.05,
    plateHeight = 0.22,
    plateDepth = 0.28,
    plateOffsetX = -0.055,
    bracketLength = 0.1,
    bracketHeight = 0.05,
    bracketDepth = 0.07,
    bracketOffsetX = -0.005,
    bracketOffsetY = 0.1,
    bodyOffsetX = 0.06,
    chimneyHeight = 0.3,
    chimneyTopRadius = 0.1,
    chimneyBottomRadius = 0.105,
    chimneyCenterY = -0.05,
    capRadius = 0.115,
    capHeight = 0.05,
    capCenterY = 0.12,
    bowlTopRadius = 0.09,
    bowlBottomRadius = 0.11,
    bowlHeight = 0.05,
    bowlCenterY = -0.22,
    radialSegments = 8,
    innerScale = 0.96,
    inner = true,
  }: WallSconceGeometryOptions = {}) {
    super();

    this.bodyOffsetX = bodyOffsetX;
    this.chimneyCenterY = chimneyCenterY;
    this.innerScale = innerScale;
    this.inner = inner;
    this.lightCenterX = bodyOffsetX;
    this.lightCenterY = chimneyCenterY;
    this.lightCenterZ = 0;

    const mount: BufferGeometry[] = [];

    const plate = new BoxGeometry(plateThickness, plateHeight, plateDepth);
    plate.translate(plateOffsetX, 0, 0);
    mount.push(plate);

    const bracket = new BoxGeometry(bracketLength, bracketHeight, bracketDepth);
    bracket.translate(bracketOffsetX, bracketOffsetY, 0);
    mount.push(bracket);

    const frame: BufferGeometry[] = [];

    const cap = new CylinderGeometry(capRadius, capRadius, capHeight, radialSegments);
    cap.translate(bodyOffsetX, capCenterY, 0);
    frame.push(cap);

    const bowl = new CylinderGeometry(bowlTopRadius, bowlBottomRadius, bowlHeight, radialSegments);
    bowl.translate(bodyOffsetX, bowlCenterY, 0);
    frame.push(bowl);

    const mountMerged = mergeBufferGeometries(
      mount.map((part) => part.toNonIndexed()),
      false,
    ) as BufferGeometry;
    const frameMerged = mergeBufferGeometries(
      frame.map((part) => part.toNonIndexed()),
      false,
    ) as BufferGeometry;

    const parts = [mountMerged, frameMerged];

    if (inner) {
      const glass = new CylinderGeometry(
        chimneyTopRadius * innerScale,
        chimneyBottomRadius * innerScale,
        chimneyHeight * innerScale,
        radialSegments,
      );
      glass.translate(bodyOffsetX, chimneyCenterY, 0);
      parts.push(glass.toNonIndexed());
    }

    this.copy(mergeBufferGeometries(parts, true) as BufferGeometry);
    this.computeBoundingSphere();
  }
}