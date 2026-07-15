import { Shape } from "three";

export interface HeartShapeOptions {
  /** Overall scale factor. Defaults to `1`. */
  size?: number;
  /** Heart width across the lobes. Defaults to `1.8`. */
  width?: number;
  /** Heart height, lobe tops to tip. Defaults to `1.7`. */
  height?: number;
}

/**
 * Heart profile — two bulbous circular lobes sweeping down to a sharp tip.
 *
 * **The lobes are real circles, not cubics pretending to be round.** A heart is two discs set side by
 * side, met at a cleft, with the outer edges sweeping in to a point — so that is exactly how it is drawn
 * here: two half-circle arcs of radius `width / 4`, joined tip-ward by concave curves. Faking the lobes
 * with beziers is what leaves them flat and lopsided.
 *
 * Because the lobe radius is set by `width` alone, **stretching `height` lengthens the point without
 * deflating the lobes** — a tall heart stays round on top, which a single width/height scale of a bezier
 * heart never manages.
 *
 * Centered on the origin; `width` / `height` are its real extents. The card suit, sibling to
 * {@link SpadeShape}, {@link ClubShape}, {@link DiamondShape}.
 */
export class HeartShape extends Shape {
  constructor({ size = 1, width = 1.8, height = 1.7 }: HeartShapeOptions = {}) {
    super();

    const r = (width / 4) * size; // lobe radius — the widest point is ±2r
    const cy = (height / 2) * size - r; // lobe centers, placed so the bbox centers on the origin
    const tip = -(height / 2) * size;

    // Cleft, around the left lobe to the widest point, sweep down to the tip, up the right, around the
    // right lobe back to the cleft.
    this.moveTo(0, cy);
    this.absarc(-r, cy, r, 0, Math.PI, false);
    this.bezierCurveTo(-2 * r, cy - r * 1.2, -r * 0.9, tip * 0.5, 0, tip);
    this.bezierCurveTo(r * 0.9, tip * 0.5, 2 * r, cy - r * 1.2, 2 * r, cy);
    this.absarc(r, cy, r, 0, Math.PI, false);
  }
}
