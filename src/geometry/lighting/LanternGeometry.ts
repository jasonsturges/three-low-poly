import { BufferGeometry, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

export interface LanternGeometryOptions {
  /** Base / foot radius. Defaults to `0.5`. */
  baseWidth?: number;
  /** Glass body height. Defaults to `1.3`. */
  bodyHeight?: number;
  /** Base height. Defaults to `0.2`. */
  baseHeight?: number;
  /** Roof cone height. Defaults to `0.5`. */
  roofHeight?: number;
  /** Roof cone radius. Defaults to `baseWidth * 1.1`. */
  roofRadius?: number;
  /** Glass radius relative to `baseWidth`. Defaults to `0.9`. */
  glassRadiusScale?: number;
  /** Glass height inset relative to `bodyHeight`. Defaults to `0.96`. */
  innerScale?: number;
  /** Carry-handle major radius. Defaults to `baseWidth * 0.8`. */
  handleRadius?: number;
  /** Carry-handle tube radius. Defaults to `0.05`. */
  handleTubeRadius?: number;
  /** Gap above the roof to the handle center. Defaults to `0.35`. */
  handleLift?: number;
  /** Radial segments on round parts. Defaults to `8`. */
  segments?: number;
  /** Include the emissive glass body. Defaults to `true`. */
  inner?: boolean;
}

/**
 * Tabletop lantern — wood/metal base, roof, and handle framing an emissive
 * glass body.
 *
 * Material groups: `0` frame (base + roof + handle), `1` glass body.
 *
 * Local frame: sits on the Y=0 plane; lamp center at `lampCenterY`.
 */
export class LanternGeometry extends BufferGeometry {
  readonly baseWidth: number;
  readonly bodyHeight: number;
  readonly baseHeight: number;
  readonly innerScale: number;
  readonly inner: boolean;
  readonly lampCenterY: number;

  constructor({
    baseWidth = 0.5,
    bodyHeight = 1.3,
    baseHeight = 0.2,
    roofHeight = 0.5,
    roofRadius = baseWidth * 1.1,
    glassRadiusScale = 0.9,
    innerScale = 0.96,
    handleRadius = baseWidth * 0.8,
    handleTubeRadius = 0.05,
    handleLift = 0.35,
    segments = 8,
    inner = true,
  }: LanternGeometryOptions = {}) {
    super();

    this.baseWidth = baseWidth;
    this.bodyHeight = bodyHeight;
    this.baseHeight = baseHeight;
    this.innerScale = innerScale;
    this.inner = inner;
    this.lampCenterY = baseHeight + bodyHeight / 2;

    const frame: BufferGeometry[] = [];

    const base = new CylinderGeometry(baseWidth, baseWidth, baseHeight, segments);
    base.translate(0, baseHeight / 2, 0);
    frame.push(base);

    const roofBottomY = baseHeight + bodyHeight;
    const roof = new ConeGeometry(roofRadius, roofHeight, segments);
    roof.translate(0, roofBottomY + roofHeight / 2, 0);
    frame.push(roof);

    const roofTopY = roofBottomY + roofHeight;
    const handle = new TorusGeometry(handleRadius, handleTubeRadius, segments, segments * 2);
    handle.translate(0, roofTopY + handleLift, 0);
    frame.push(handle);

    const frameMerged = mergeBufferGeometries(
      frame.map((part) => part.toNonIndexed()),
      false,
    ) as BufferGeometry;

    const parts = [frameMerged];

    if (inner) {
      const glass = new CylinderGeometry(
        baseWidth * glassRadiusScale * innerScale,
        baseWidth * glassRadiusScale * innerScale,
        bodyHeight * innerScale,
        segments,
      );
      glass.translate(0, this.lampCenterY, 0);
      parts.push(glass.toNonIndexed());
    }

    this.copy(mergeBufferGeometries(parts, true) as BufferGeometry);
    this.computeBoundingSphere();
  }
}