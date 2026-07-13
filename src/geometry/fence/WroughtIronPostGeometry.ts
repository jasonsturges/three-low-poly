import { BufferGeometry, CylinderGeometry, SphereGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface WroughtIronPostGeometryOptions {
  /** Shaft height, excluding the ball. Defaults to `1.1`. */
  height?: number;
  /** Shaft radius. Defaults to `0.06`. */
  radius?: number;
  /** Ball finial radius. Defaults to `0.1`. */
  ballRadius?: number;
  /**
   * How far the ball's center sits above the shaft top — it settles onto the shaft rather than
   * balancing on it. Defaults to `ballRadius * 0.6`.
   */
  ballOffset?: number;
  /** Shaft circumference segments. Defaults to `6`. */
  radialSegments?: number;
  /** Ball circumference segments. Defaults to `8`. */
  ballWidthSegments?: number;
  /** Ball vertical segments. Defaults to `6`. */
  ballHeightSegments?: number;
}

/**
 * Wrought-iron fence post — a slim shaft under a ball finial, standing a little proud of the
 * pickets it supports. The post to a {@link WroughtIronPicketGeometry}'s infill, and the right
 * weight for a small fenced plot where a stone pier would be far too heavy.
 *
 * Local frame: base at Y=0.
 *
 * @example
 * ```ts
 * const geometry = new WroughtIronPostGeometry({ height: 1.25 });
 * const post = new Mesh(geometry, ironMaterial);
 * scene.add(post);
 * ```
 */
export class WroughtIronPostGeometry extends BufferGeometry {
  /** Shaft height, excluding the ball. */
  readonly height: number;
  readonly radius: number;
  readonly ballRadius: number;
  /** Y of the ball's center. */
  readonly ballCenterY: number;

  constructor({
    height = 1.1,
    radius = 0.06,
    ballRadius = 0.1,
    ballOffset = ballRadius * 0.6,
    radialSegments = 6,
    ballWidthSegments = 8,
    ballHeightSegments = 6,
  }: WroughtIronPostGeometryOptions = {}) {
    super();

    this.height = height;
    this.radius = radius;
    this.ballRadius = ballRadius;
    this.ballCenterY = height + ballOffset;

    const shaft = new CylinderGeometry(radius, radius, height, radialSegments);
    shaft.translate(0, height / 2, 0);

    const ball = new SphereGeometry(ballRadius, ballWidthSegments, ballHeightSegments);
    ball.translate(0, this.ballCenterY, 0);

    this.copy(mergeGeometries([shaft, ball], false) as BufferGeometry);
  }

  /** Overall height, ball included. */
  get totalHeight(): number {
    return this.ballCenterY + this.ballRadius;
  }

  /**
   * Post width at height `y` — what a fence run asks to size itself against.
   *
   * Zero above and below the post. Through the ball this is the sphere's chord, so it tapers
   * rather than stepping.
   *
   * Widths are circumscribed, not face-to-face: a low-poly shaft is a hexagon, so its true width
   * varies with the angle you approach from. Reporting the widest case keeps a run clear of the
   * post no matter how it meets it.
   */
  widthAt(y: number): number {
    const shaft = y >= 0 && y <= this.height ? this.radius * 2 : 0;

    const dy = y - this.ballCenterY;
    const ball =
      Math.abs(dy) <= this.ballRadius
        ? 2 * Math.sqrt(this.ballRadius * this.ballRadius - dy * dy)
        : 0;

    return Math.max(shaft, ball);
  }

  /**
   * Widest the post gets between two heights — what pickets must clear to avoid burying themselves
   * in the post.
   */
  maxWidthBetween(y0: number, y1: number): number {
    const lo = Math.min(y0, y1);
    const hi = Math.max(y0, y1);

    // The ball is widest at its equator; clamp that into the range to find the local maximum.
    const equator = Math.min(hi, Math.max(lo, this.ballCenterY));

    return Math.max(this.widthAt(lo), this.widthAt(hi), this.widthAt(equator));
  }
}
