import { Shape, Vector2 } from "three";

export interface RackShapeOptions {
  /** Number of teeth. Defaults to `12`. */
  teeth?: number;
  /**
   * Tooth period — centre to centre of consecutive teeth. Defaults to `0.25`.
   *
   * This is the rack's counterpart to a gear's circumferential pitch. For a rack and pinion to mesh, set it to
   * `2π × pitchRadius / pinionTeeth`.
   */
  pitch?: number;
  /** Height from the root line to the tooth tips. Defaults to `0.18`. */
  toothHeight?: number;
  /** Height of the solid bar below the roots — the backing the teeth stand on. Defaults to `0.2`. */
  baseHeight?: number;
  /** Flat bar before the first tooth and after the last. Defaults to `0.06`. */
  endMargin?: number;
  /**
   * Width of the flat at the tooth tip, as a fraction of one period. `0` brings the tooth to a point. Defaults
   * to `0.25`.
   */
  tipWidth?: number;
  /**
   * Width of the flat at the root, as a fraction of one period. `0` brings the root to a point. Defaults to
   * `0.25`.
   */
  valleyWidth?: number;
  /**
   * Tooth asymmetry, `-1` to `1`. At `0` both flanks are equal; at `1` the rising flank vanishes and the tooth's
   * trailing face drops vertically — a linear ratchet. Defaults to `0`.
   */
  lean?: number;
}

/**
 * Rack profile — the straight counterpart of a gear, as in rack and pinion.
 *
 * **A rack is a gear of infinite radius.** The teeth no longer converge on a centre, so they stand parallel and
 * the period advances along a line rather than around a circle. That is why the tooth fractions are identical to
 * {@link GearShape}'s — tip, falling flank, root, rising flank, with the two flats sized independently and the
 * flanks taking the remainder — and why there is no polar arithmetic here at all.
 *
 * **Length is an output, never an input.** It comes to `endMargin × 2 + teeth × pitch`, so every tooth is whole
 * by construction. Asking for a length instead would leave a fractional tooth at one end, which is the defect
 * that makes a repeating run look wrong.
 *
 * Rests with the bar's underside on `y = 0`, teeth pointing up, running along `+X` from the origin.
 */
export class RackShape extends Shape {
  /** Overall length — `endMargin × 2 + teeth × pitch`. */
  readonly length: number;
  /** Y of the root line, where the teeth spring from the bar. */
  readonly rootY: number;
  /** Y of the tooth tips — the full height of the rack. */
  readonly tipY: number;

  constructor({
    teeth = 12,
    pitch = 0.25,
    toothHeight = 0.18,
    baseHeight = 0.2,
    endMargin = 0.06,
    tipWidth = 0.25,
    valleyWidth = 0.25,
    lean = 0,
  }: RackShapeOptions = {}) {
    super();

    const count = Math.max(1, Math.round(teeth));
    const period = Math.max(pitch, 1e-4);
    const margin = Math.max(endMargin, 0);
    const rootY = Math.max(baseHeight, 1e-4);
    const tipY = rootY + Math.max(toothHeight, 1e-4);

    this.length = margin * 2 + count * period;
    this.rootY = rootY;
    this.tipY = tipY;

    // Identical period split to the circular gears: the two flats are sized independently and whatever is left
    // of the period is divided between the flanks, biased by `lean`.
    const tip = Math.max(0, Math.min(tipWidth, 1));
    const valley = Math.max(0, Math.min(valleyWidth, 1 - tip));
    const flanks = 1 - tip - valley;
    const bias = Math.max(-1, Math.min(lean, 1));
    const falling = (flanks * (1 + bias)) / 2;
    const rising = flanks - falling;

    // The toothed top, traced left to right; it is reversed below so the whole outline winds counter-clockwise.
    //
    // The period is split so HALF the root flat sits at each end of it: half-root, rising, tip, falling,
    // half-root. Two things follow, and both are visible defects otherwise.
    //
    // Emitting the tip first leaves the end margin with no root-level run to sit on, so the first flank
    // stretches across it as one long shallow ramp unlike any other tooth on the bar.
    //
    // Emitting a whole root flat at the END of each period instead makes the run start with a flank and finish
    // with a flat, so the two ends of the bar carry different amounts of plain material. Splitting the flat
    // gives every tooth an identical neighbourhood and leaves both ends `margin + valley / 2` of flat.
    const half = valley / 2;
    const top: Vector2[] = [new Vector2(0, rootY)];

    for (let n = 0; n < count; n++) {
      const start = margin + period * n;
      const at = (fraction: number, y: number) => top.push(new Vector2(start + fraction * period, y));

      // Bottom of the rising flank, at the end of the leading half root flat.
      at(half, rootY);

      if (tip > 0) {
        at(half + rising, tipY);
        at(half + rising + tip, tipY);
      } else {
        at(half + rising, tipY);
      }

      // Bottom of the falling flank. From here to the period's end is the trailing half root flat, which meets
      // the next period's leading half to form one whole valley.
      at(1 - half, rootY);
    }

    top.push(new Vector2(this.length, rootY));

    // Counter-clockwise: along the underside, up the right end, back across the teeth, down the left end.
    this.moveTo(0, 0);
    this.lineTo(this.length, 0);
    for (let i = top.length - 1; i >= 0; i--) this.lineTo(top[i]!.x, top[i]!.y);
    this.closePath();
  }
}
