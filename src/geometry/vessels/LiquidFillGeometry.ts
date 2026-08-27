import { BufferGeometry, LatheGeometry, Vector2 } from "three";
import { fillProfile } from "./vesselProfiles";

export interface LiquidFillGeometryOptions {
  /** The vessel profile to fill — take it from a vessel geometry's `profile`. */
  profile: Vector2[];
  /** Fill level, as a fraction of the vessel's height. `0` is empty. Defaults to `0`. */
  fill?: number;
  /** Radius inset so the liquid wall isn't coplanar with the glass. Defaults to `0.02`. */
  inset?: number;
  /** Circumference segments — match the vessel's for a clean surface. Defaults to `32`. */
  radialSegments?: number;
}

/**
 * The liquid inside a vessel, cut from the vessel's OWN profile (see {@link fillProfile}) and revolved.
 *
 * Pure geometry: the liquid's colour, opacity and glow are a material the caller supplies. Because it is
 * turned from the same curve as the glass, it can never clip through it. Comes back EMPTY (no attributes)
 * when the vessel is empty, so a caller can always build one and drive `fill` from a control.
 *
 * Draw the liquid BEFORE the glass (`liquid.renderOrder < shell.renderOrder`): their centres coincide, so
 * depth-sorting has nothing to say and the order must be stated.
 */
export class LiquidFillGeometry extends BufferGeometry {
  readonly fillHeight: number;

  constructor({ profile, fill = 0, inset = 0.02, radialSegments = 32 }: LiquidFillGeometryOptions) {
    super();
    const contents = fillProfile(profile, fill, inset);
    if (contents.length >= 2) {
      const lathe = new LatheGeometry(contents, radialSegments);
      this.copy(lathe);
      lathe.dispose();
      this.fillHeight = contents[contents.length - 1]!.y - (profile[0]?.y ?? 0);
    } else {
      this.fillHeight = 0;
    }
  }
}
