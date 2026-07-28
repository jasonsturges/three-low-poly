import { Shape, Vector2 } from "three";

export interface RackShapeOptions {
  /** Overall length of the bar, end to end. Defaults to `3`. */
  length?: number;
  /** Number of teeth. Defaults to `12`. */
  teeth?: number;
  /** Height of the tooth roots — the top of the solid bar the teeth stand on. Defaults to `0.2`. */
  rootHeight?: number;
  /**
   * Height the tooth tips reach — the **full** height of the rack, since these teeth point up. Defaults to
   * `0.38`.
   */
  tipHeight?: number;
  /**
   * Flat carved out of **each** end before the toothed run begins. Defaults to `0`.
   *
   * Taken out of {@link RackShapeOptions.length}, never added to it: the bar measures `length` whatever this is
   * set to, and the teeth crowd into what is left.
   *
   * **Any nonzero inset destroys tileability** — hence the default of `0`. At `0` each end carries exactly half
   * a valley, so two racks butted end to end form a seam valley identical to an interior one and a pinion rolls
   * across the join without a hitch. An inset adds `inset × 2` to that seam and the gap becomes visible. Use it
   * for a standalone bar that wants plain material at its ends, not for a run.
   */
  inset?: number;
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
 * **{@link pitch} is an output, not an input** — `(length − inset × 2) / teeth`, the way a gear's circumferential
 * pitch is `2π × outerRadius / teeth`. Size the bar, then choose how finely to divide it: teeth subdivide a
 * fixed run instead of extending it, so every tooth is whole by construction and adding teeth never moves the
 * ends.
 *
 * {@link RackShapeOptions.tipHeight} and {@link RackShapeOptions.rootHeight} are absolute, like the radii on the
 * circular gears, and their order is not enforced. Put the tip *below* the root and the profile cuts channels
 * into the bar rather than raising teeth off it.
 *
 * Rests with the bar's underside on `y = 0`, teeth pointing up, running along `+X` from the origin.
 */
export class RackShape extends Shape {
  /** Overall length of the bar, after clamping. */
  readonly length: number;
  /** Tooth period, centre to centre — `(length − inset × 2) / teeth`. */
  readonly pitch: number;
  /** Y of the root line, where the teeth spring from the bar. */
  readonly rootY: number;
  /** Y of the tooth tips. */
  readonly tipY: number;

  constructor({
    length = 3,
    teeth = 12,
    tipHeight = 0.38,
    rootHeight = 0.2,
    inset = 0,
    tipWidth = 0.25,
    valleyWidth = 0.25,
    lean = 0,
  }: RackShapeOptions = {}) {
    super();

    const span = Math.max(length, 1e-4);
    const count = Math.max(1, Math.round(teeth));
    // The insets are carved out of the span, so they can never consume the whole of it.
    const margin = Math.min(Math.max(inset, 0), span / 2 - 1e-5);
    const period = (span - margin * 2) / count;
    const rootY = Math.max(rootHeight, 1e-4);
    const tipY = Math.max(tipHeight, 1e-4);

    this.length = span;
    this.pitch = period;
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
    // Emitting the tip first leaves the end inset with no root-level run to sit on, so the first flank
    // stretches across it as one long shallow ramp unlike any other tooth on the bar.
    //
    // Emitting a whole root flat at the END of each period instead makes the run start with a flank and finish
    // with a flat, so the two ends of the bar carry different amounts of plain material. Splitting the flat
    // gives every tooth an identical neighbourhood and leaves both ends `inset + pitch × valley / 2` of flat.
    //
    // The half at each end is what makes racks TILE. At `inset: 0` a trailing half meets the next bar's leading
    // half to form a seam valley identical to an interior one, so a run of racks meshes as though it were one.
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

    top.push(new Vector2(span, rootY));

    // Counter-clockwise: along the underside, up the right end, back across the teeth, down the left end.
    this.moveTo(0, 0);
    this.lineTo(span, 0);
    for (let i = top.length - 1; i >= 0; i--) this.lineTo(top[i]!.x, top[i]!.y);
    this.closePath();
  }
}
