import { Path } from "three";
import { GearShape, type GearShapeOptions } from "./GearShape";

export interface CrossedWheelShapeOptions extends GearShapeOptions {
  /**
   * Number of crossings — the radial spokes. Defaults to `5`.
   *
   * Fewer than `2` leaves the web solid, which is what {@link GearShape} already is.
   */
  crossings?: number;
  /** Tangential thickness of each crossing, in world units. Defaults to `0.08`. */
  crossingWidth?: number;
  /** Outer radius of the hub — the disc the crossings spring from. Defaults to `0.3`. */
  hubRadius?: number;
  /**
   * Material kept inward of the tooth valleys, holding the teeth onto the rim. Defaults to `0.1`.
   *
   * Take this to zero and the teeth have nothing behind them: the cut-outs would reach the valley floor and
   * the rim would fall apart into loose teeth.
   */
  rimWidth?: number;
  /** Segments along each cut-out's inner and outer arcs. Defaults to `6`. */
  crossingSegments?: number;
}

/**
 * A **crossed-out wheel** — a gear whose web has been cut away, leaving radial spokes.
 *
 * In horology the spokes are **crossings** and the operation is *crossing out*: clock and watch wheels were
 * crossed out to shed weight and brass, so the train had less inertia to drive. A wheel is described by the
 * count — a *five-crossing wheel*. Engineering calls the same thing spokes or arms, and the solid disc version
 * a web.
 *
 * The anatomy, and the parameters that control it:
 *
 * - **rim** — the toothed outer ring. Its depth inward of the valleys is {@link CrossedWheelShapeOptions.rimWidth},
 *   and it is what the teeth are attached to.
 * - **crossings** — the spokes, {@link CrossedWheelShapeOptions.crossings} of them at
 *   {@link CrossedWheelShapeOptions.crossingWidth} thick.
 * - **hub** — the center disc, out to {@link CrossedWheelShapeOptions.hubRadius}.
 * - **bore** — the hole for the arbor, inherited from {@link GearShape}.
 *
 * Every tooth option is inherited, so a crossed wheel can also be spiked or leaning — a crossed-out ratchet is
 * `{ crossings: 5, tipWidth: 0, lean: 1 }`.
 *
 * **Crossings are constant width, not constant angle.** The half-angle a spoke subtends is `asin(w / 2r)`,
 * which narrows as the radius grows — so the spoke reads as a straight bar rather than a wedge that fattens
 * toward the rim.
 */
export class CrossedWheelShape extends GearShape {
  /** Crossings actually cut, after clamping. `0` means the web was left solid. */
  readonly crossings: number;
  /** The hub radius actually used, after clamping clear of the bore. */
  readonly hubRadius: number;
  /** Inner edge of the rim — where the cut-outs stop and tooth backing begins. */
  readonly rimInnerRadius: number;
  /** The crossing width actually used, after clamping so spokes cannot overlap at the hub. */
  readonly crossingWidth: number;

  constructor({
    crossings = 5,
    crossingWidth = 0.08,
    hubRadius = 0.3,
    rimWidth = 0.1,
    crossingSegments = 6,
    ...gearOptions
  }: CrossedWheelShapeOptions = {}) {
    super(gearOptions);

    const innerRadius = gearOptions.innerRadius ?? 0.5;
    const spokes = Math.max(0, Math.round(crossings));

    // The hub must enclose the bore with real metal between them, and the rim must keep backing behind the
    // teeth. Both are clamps, not suggestions — either one violated produces a wheel that falls apart.
    const hub = Math.max(hubRadius, this.holeRadius * 1.15);
    const rimInner = Math.max(innerRadius - Math.max(rimWidth, 0), hub);

    this.hubRadius = hub;
    this.rimInnerRadius = rimInner;

    // No annulus left between hub and rim, or too few spokes to define gaps: leave the web solid.
    if (spokes < 2 || rimInner - hub < 1e-6) {
      this.crossings = 0;
      this.crossingWidth = 0;
      return;
    }

    const step = (Math.PI * 2) / spokes;
    // Two spoke half-widths plus a sliver of gap must fit inside one step at the hub, where the angle a given
    // width subtends is largest.
    const maxWidth = 2 * hub * Math.sin(step / 2) * 0.9;
    const width = Math.min(Math.max(crossingWidth, 1e-4), maxWidth);

    this.crossings = spokes;
    this.crossingWidth = width;

    const segments = Math.max(1, Math.round(crossingSegments));
    // Spoke centers share the outline's phase so a crossing lines up under a tooth rather than a valley.
    const start = Math.PI / 2 + (gearOptions.rotation ?? 0);
    /** Half-angle the spoke occupies at radius `r` — shrinking with radius keeps the spoke a straight bar. */
    const half = (r: number) => Math.asin(Math.min(1, width / 2 / r));

    for (let n = 0; n < spokes; n++) {
      const from = start + step * n + half(hub);
      const to = start + step * (n + 1) - half(hub);
      const fromRim = start + step * n + half(rimInner);
      const toRim = start + step * (n + 1) - half(rimInner);
      if (to <= from || toRim <= fromRim) continue;

      const cut = new Path();
      // Out along the hub arc, up the trailing spoke edge, back along the rim arc, down the leading edge.
      for (let i = 0; i <= segments; i++) {
        const a = from + ((to - from) * i) / segments;
        const x = Math.cos(a) * hub;
        const y = Math.sin(a) * hub;
        if (i === 0) cut.moveTo(x, y);
        else cut.lineTo(x, y);
      }
      for (let i = 0; i <= segments; i++) {
        const a = toRim - ((toRim - fromRim) * i) / segments;
        cut.lineTo(Math.cos(a) * rimInner, Math.sin(a) * rimInner);
      }
      cut.closePath();
      this.holes.push(cut);
    }
  }
}
