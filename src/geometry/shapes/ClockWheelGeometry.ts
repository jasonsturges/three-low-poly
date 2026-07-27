import { ExtrudeGeometry } from "three";
import { ClockWheelShape, type ClockWheelShapeOptions } from "../../shapes/ClockWheelShape";

export interface ClockWheelGeometryOptions extends ClockWheelShapeOptions {
  /** Extrusion depth. Defaults to `0.06` — clock wheels are thin brass. */
  depth?: number;
}

/**
 * Extruded **crossed-out wheel** — a clock or watch wheel: a toothed rim carried on radial spokes.
 *
 * In horology those spokes are **crossings** and cutting them is *crossing out*, done to shed weight and brass
 * so the train has less inertia to drive. A wheel is named by the count: a *five-crossing wheel*. Where
 * {@link GearGeometry} is a solid disc with a bore, this removes the web between hub and rim.
 *
 * Every tooth option is inherited, so the crossings compose with the tooth profile — a crossed-out escapement
 * wheel is `{ crossings: 5, tipWidth: 0, lean: 1 }`.
 *
 * Local frame: **centred on its own thickness**, spanning `±depth / 2` in Z, matching
 * {@link GearGeometry} so a rank of wheels on one arbor lines up on the plane they turn in.
 *
 * Material groups: **none** — one material for the whole wheel.
 *
 * The clamps are load-bearing rather than defensive: the hub is held clear of the bore, and the rim keeps
 * backing inward of the tooth valleys. Without either, the cut-outs would reach through and the teeth would
 * come away from the wheel. {@link crossings} reports `0` when there was no annulus left to cut, in which case
 * the web is solid and this is a {@link GearGeometry} with extra steps.
 *
 * @example
 * ```typescript
 * const wheel = new Mesh(new ClockWheelGeometry({ teeth: 60, crossings: 5 }), brass);
 * ```
 */
export class ClockWheelGeometry extends ExtrudeGeometry {
  /** The bore radius actually used, after clamping inside the tooth profile. */
  readonly holeRadius: number;
  /** Crossings actually cut. `0` means the web was left solid. */
  readonly crossings: number;
  /** The hub radius actually used, after clamping clear of the bore. */
  readonly hubRadius: number;
  /** Inner edge of the rim — where the cut-outs stop and tooth backing begins. */
  readonly rimInnerRadius: number;
  /** The crossing width actually used, after clamping so spokes cannot overlap at the hub. */
  readonly crossingWidth: number;

  constructor({ depth = 0.06, ...shapeOptions }: ClockWheelGeometryOptions = {}) {
    const shape = new ClockWheelShape(shapeOptions);

    super(shape, { depth, bevelEnabled: false });

    // Centre on the thickness rather than extruding forward from zero.
    this.translate(0, 0, -depth / 2);

    this.holeRadius = shape.holeRadius;
    this.crossings = shape.crossings;
    this.hubRadius = shape.hubRadius;
    this.rimInnerRadius = shape.rimInnerRadius;
    this.crossingWidth = shape.crossingWidth;
  }
}
