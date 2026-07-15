import { Shape } from "three";

export interface DiamondShapeOptions {
  /** Overall scale factor. Defaults to `1`. */
  size?: number;
  /** Diamond width, point to point across. Defaults to `1.6`. */
  width?: number;
  /** Diamond height, point to point. Defaults to `2.2`. */
  height?: number;
  /**
   * How far the four sides bow INWARD, as a fraction of the way to the center. Defaults to `0.15`.
   *
   * `0` is a plain rhombus with straight `/` sides. Above it the sides pull in toward the middle — the
   * `)` curve a printed card diamond actually has, which keeps it from reading as a kite.
   */
  concavity?: number;
}

/**
 * Diamond profile — the fourth card suit, with gently concave sides.
 *
 * Four points (top, right, bottom, left) joined by quadratic curves that bow toward the center. A rhombus
 * with straight edges reads as flat and kite-like; the inward `)` sweep is what makes it a *card*
 * diamond. Drop `concavity` to `0` for the plain rhombus.
 *
 * Drawn counter-clockwise from the top point, centered on the origin — the family convention shared with
 * {@link SpadeShape}, {@link HeartShape}, {@link ClubShape}.
 */
export class DiamondShape extends Shape {
  constructor({ size = 1, width = 1.6, height = 2.2, concavity = 0.15 }: DiamondShapeOptions = {}) {
    super();

    const hx = (width / 2) * size;
    const hy = (height / 2) * size;
    const k = 1 - concavity; // pulls each side's control point in toward the center

    // Top → left → bottom → right, each edge's control point on the line to the center so the side bows in.
    this.moveTo(0, hy);
    this.quadraticCurveTo(-hx * 0.5 * k, hy * 0.5 * k, -hx, 0);
    this.quadraticCurveTo(-hx * 0.5 * k, -hy * 0.5 * k, 0, -hy);
    this.quadraticCurveTo(hx * 0.5 * k, -hy * 0.5 * k, hx, 0);
    this.quadraticCurveTo(hx * 0.5 * k, hy * 0.5 * k, 0, hy);
  }
}
