import { Shape, Vector2 } from "three";

export interface RackShapeOptions {
  /** Overall length of the bar, end to end. Defaults to `3`. */
  length?: number;
  /** Number of teeth. Defaults to `12`. */
  teeth?: number;
  /**
   * Height the tooth tips reach, measured from the underside. Defaults to `0.38`.
   *
   * Absolute, like the radii on the circular gears — and paired with
   * {@link RackShapeOptions.valleyHeight} the same way {@link RackShapeOptions.tipWidth} is paired with
   * {@link RackShapeOptions.valleyWidth}.
   */
  tipHeight?: number;
  /**
   * Height the valley floors sit at, measured from the underside. Defaults to `0.2`.
   *
   * Absolute from the same datum as {@link RackShapeOptions.tipHeight}, so the two are directly comparable.
   *
   * **Their order is not enforced.** Set the valley above the tip and the teeth invert into channels cut down
   * into the bar — a legitimate shape, and the caller's business.
   */
  valleyHeight?: number;
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
   * Width of the flat at the valley floor, as a fraction of one period. `0` brings the valley to a point.
   * Defaults to `0.25`.
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
 * {@link GearShape}'s — tip, falling flank, valley, rising flank, with the two flats sized independently and the
 * flanks taking the remainder — and why there is no polar arithmetic here at all.
 *
 * **{@link pitch} is an output, not an input** — `(length − inset × 2) / teeth`. Size the bar, then choose how
 * finely to divide it: teeth subdivide a fixed run instead of extending it, so every tooth is whole by
 * construction and adding teeth never moves the ends. A circular gear divides its circumference the same way,
 * `2π × outerRadius / teeth`, though it does not publish the result.
 *
 * **{@link RackShapeOptions.tipHeight} and {@link RackShapeOptions.valleyHeight} are absolute**, both measured
 * from the underside, exactly as the circular gears measure both their radii from the centre. That completes a
 * grid with the tooth flats — `tipWidth`/`tipHeight`, `valleyWidth`/`valleyHeight` — and their order is not
 * enforced: put the valley above the tip and the teeth invert into channels.
 *
 * Rests with its underside on `y = 0`, teeth pointing up, running along `+X` from the origin.
 */
export class RackShape extends Shape {
  /** Overall length of the bar, after clamping. */
  readonly length: number;
  /** Tooth period, centre to centre — `(length − inset × 2) / teeth`. */
  readonly pitch: number;
  /** Height the tooth tips reach, after clamping. */
  readonly tipHeight: number;
  /** Height the valley floors sit at, after clamping. */
  readonly valleyHeight: number;
  /** Tip flat as a fraction of the period, after clamping. */
  readonly tipWidth: number;
  /** Valley flat as a fraction of the period, after clamping. */
  readonly valleyWidth: number;

  constructor({
    length = 3,
    teeth = 12,
    tipHeight = 0.38,
    valleyHeight = 0.2,
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
    // Both clamped only off the floor: at or below y=0 the outline would cross its own underside and leave no
    // polygon to triangulate. Their ORDER is deliberately free — valley above tip inverts the teeth.
    const tipY = Math.max(tipHeight, 1e-4);
    const valleyY = Math.max(valleyHeight, 1e-4);

    this.tipHeight = tipY;
    this.valleyHeight = valleyY;
    this.length = span;
    this.pitch = period;

    // Identical period split to the circular gears: the two flats are sized independently and whatever is left
    // of the period is divided between the flanks, biased by `lean`.
    //
    // NOTE the priority, which is shared with `GearShape` and is undecided rather than designed: the TIP takes
    // what it asks for and the VALLEY absorbs the whole overflow, so tip 0.8 / valley 0.4 resolves to 0.8 / 0.2
    // and `tipWidth: 1` erases the valley entirely.
    const tip = Math.max(0, Math.min(tipWidth, 1));
    const valley = Math.max(0, Math.min(valleyWidth, 1 - tip));
    const flanks = 1 - tip - valley;

    this.tipWidth = tip;
    this.valleyWidth = valley;
    const bias = Math.max(-1, Math.min(lean, 1));
    const falling = (flanks * (1 + bias)) / 2;
    const rising = flanks - falling;

    // The toothed top, traced left to right; it is reversed below so the whole outline winds counter-clockwise.
    //
    // The period is split so HALF the valley flat sits at each end of it: half-valley, rising, tip, falling,
    // half-valley. Both alternatives are visible defects — emitting the tip first leaves the end inset with no
    // valley-level run to sit on, so the first flank stretches across it as one long shallow ramp; emitting a
    // whole valley flat at the END of each period makes the two ends of the bar carry different amounts of
    // plain material.
    //
    // The half at each end is also what makes racks TILE. At `inset: 0` a trailing half meets the next bar's
    // leading half to form a seam valley identical to an interior one.
    const half = valley / 2;
    const top: Vector2[] = [new Vector2(0, valleyY)];

    for (let n = 0; n < count; n++) {
      const start = margin + period * n;
      const at = (fraction: number, y: number) => top.push(new Vector2(start + fraction * period, y));

      // Bottom of the rising flank, at the end of the leading half valley.
      at(half, valleyY);

      if (tip > 0) {
        at(half + rising, tipY);
        at(half + rising + tip, tipY);
      } else {
        at(half + rising, tipY);
      }

      // Bottom of the falling flank. From here to the period's end is the trailing half valley, which meets
      // the next period's leading half to form one whole valley.
      at(1 - half, valleyY);
    }

    top.push(new Vector2(span, valleyY));

    // Counter-clockwise: along the underside, up the right end, back across the teeth, down the left end.
    this.moveTo(0, 0);
    this.lineTo(span, 0);
    for (let i = top.length - 1; i >= 0; i--) this.lineTo(top[i]!.x, top[i]!.y);
    this.closePath();
  }
}
