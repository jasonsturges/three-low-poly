import { Path, Shape, Vector2 } from "three";

export interface InternalGearShapeOptions {
  /** Number of teeth. Defaults to `36`. */
  teeth?: number;
  /** Radius the tooth tips reach. Defaults to `0.72`. */
  tipRadius?: number;
  /** Radius the valley floors sit at. Defaults to `0.85`. */
  valleyRadius?: number;
  /** Outside radius of the ring. Clamped to stay outside the toothed opening. Defaults to `1`. */
  rimRadius?: number;
  /** Sides on the outer rim. Defaults to `48`. */
  rimSides?: number;
  /**
   * Width of the flat at the tooth tip, as a fraction of one tooth period. `0` brings the tooth to a point.
   * Defaults to `0.25`.
   */
  tipWidth?: number;
  /**
   * Width of the flat at the valley floor, as a fraction of one tooth period. `0` brings the valley to a point.
   * Defaults to `0.25`.
   */
  valleyWidth?: number;
  /**
   * Tooth asymmetry, `-1` to `1`. At `0` both flanks are equal; at `1` the rising flank vanishes. Defaults to
   * `0`.
   */
  lean?: number;
  /** Rotation in radians from the resting state. Defaults to `0`. */
  rotation?: number;
}

/**
 * Internal gear profile — a plain ring whose **opening is toothed**, teeth pointing inward.
 *
 * Where {@link GearShape} makes the teeth its outer contour and cuts a bore, this inverts the roles: the outer
 * contour is a plain circle and the teeth are the hole. The tooth period is the external gear's, unchanged.
 *
 * **Three radii, all absolute from the centre.** {@link InternalGearShapeOptions.tipRadius} and
 * {@link InternalGearShapeOptions.valleyRadius} are the two extremes of the toothing; their order is not
 * enforced, so a valley inside the tip inverts it. {@link InternalGearShapeOptions.rimRadius} is the third
 * because the teeth do not define the outer edge here — the opening is a hole, so the ring needs its own
 * outside dimension.
 */
export class InternalGearShape extends Shape {
  /** The tip radius actually used. */
  readonly tipRadius: number;
  /** The valley radius actually used. */
  readonly valleyRadius: number;
  /** The rim radius actually used, after clamping outside the toothed opening. */
  readonly rimRadius: number;

  constructor({
    teeth = 36,
    tipRadius = 0.72,
    valleyRadius = 0.85,
    rimRadius = 1,
    rimSides = 48,
    tipWidth = 0.25,
    valleyWidth = 0.25,
    lean = 0,
    rotation = 0,
  }: InternalGearShapeOptions = {}) {
    super();

    const count = Math.max(3, Math.round(teeth));
    const tip = Math.max(tipRadius, 1e-3);
    const valley = Math.max(valleyRadius, 1e-3);

    this.tipRadius = tip;
    this.valleyRadius = valley;

    const step = (Math.PI * 2) / count;
    const start = Math.PI / 2 + rotation;

    const sides = Math.max(3, Math.round(rimSides));
    const rimStep = (Math.PI * 2) / sides;
    // The opening's farthest point is always a vertex, so the larger extreme is what the rim must clear.
    const rim = Math.max(rimRadius, Math.max(tip, valley) * 1.02);
    this.rimRadius = rim;

    for (let n = 0; n < sides; n++) {
      const angle = start + rimStep * n;
      const x = Math.cos(angle) * rim;
      const y = Math.sin(angle) * rim;
      if (n === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
    this.closePath();

    const flatTip = Math.max(0, Math.min(tipWidth, 1));
    const flatValley = Math.max(0, Math.min(valleyWidth, 1 - flatTip));
    const flanks = 1 - flatTip - flatValley;
    const bias = Math.max(-1, Math.min(lean, 1));
    const falling = (flanks * (1 + bias)) / 2;

    const opening = new Path();
    const outline: Vector2[] = [];

    for (let n = 0; n < count; n++) {
      const center = start + step * n;
      const at = (fraction: number, radius: number) => {
        const angle = center + fraction * step;
        outline.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
      };

      if (flatTip > 0) {
        at(-flatTip / 2, tip);
        at(flatTip / 2, tip);
      } else {
        at(0, tip);
      }

      if (flatValley > 0) {
        at(flatTip / 2 + falling, valley);
        at(flatTip / 2 + falling + flatValley, valley);
      } else {
        at(flatTip / 2 + falling, valley);
      }
    }

    opening.setFromPoints(outline);
    opening.closePath();
    this.holes.push(opening);
  }
}
