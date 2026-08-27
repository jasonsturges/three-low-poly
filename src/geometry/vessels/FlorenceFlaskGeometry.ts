import { LatheGeometry, Vector2 } from "three";
import {
  florenceFlaskProfile,
  vesselShell,
  type FlorenceFlaskProfileOptions,
  type VesselShellOptions,
} from "./vesselProfiles";

export interface FlorenceFlaskGeometryOptions extends FlorenceFlaskProfileOptions, VesselShellOptions {
  /** Circumference segments — the low-poly knob. Defaults to `32`. */
  radialSegments?: number;
}

/**
 * Florence flask — a spherical bulb drawn out into a straight neck, walled to a real glass thickness.
 *
 * A lathe of {@link vesselShell} over {@link florenceFlaskProfile}. The outer silhouette is exposed as
 * `.profile`, so the same curve drives the glass, the liquid inside it ({@link LiquidFillGeometry}), or a
 * measurement. A round-bottom flask cannot stand on its own — see {@link FlorenceFlaskStand}. Local frame:
 * bulb bottom on Y=0, opening up +Y.
 */
export class FlorenceFlaskGeometry extends LatheGeometry {
  readonly profile: Vector2[];
  readonly bodyRadius: number;
  readonly height: number;

  constructor(options: FlorenceFlaskGeometryOptions = {}) {
    const silhouette = florenceFlaskProfile(options);
    super(vesselShell(silhouette, options), options.radialSegments ?? 32);
    this.profile = silhouette;
    this.bodyRadius = options.bodyRadius ?? 1;
    this.height = silhouette.reduce((m, p) => Math.max(m, p.y), 0);
  }
}
