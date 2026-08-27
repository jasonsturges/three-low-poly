import { LatheGeometry, Vector2 } from "three";
import {
  erlenmeyerFlaskProfile,
  vesselShell,
  type ErlenmeyerFlaskProfileOptions,
  type VesselShellOptions,
} from "./vesselProfiles";

export interface ErlenmeyerFlaskGeometryOptions extends ErlenmeyerFlaskProfileOptions, VesselShellOptions {
  /** Circumference segments — the low-poly knob. Defaults to `16`. */
  radialSegments?: number;
}

/**
 * Erlenmeyer flask — a conical body rising to a straight neck, walled to a real glass thickness.
 *
 * A lathe of {@link vesselShell} over {@link erlenmeyerFlaskProfile}. The outer silhouette is exposed as
 * `.profile`, so the same curve drives the glass, the liquid inside it ({@link LiquidFillGeometry}), or a
 * measurement. Local frame: base on Y=0.
 */
export class ErlenmeyerFlaskGeometry extends LatheGeometry {
  readonly profile: Vector2[];
  readonly bodyRadius: number;
  readonly height: number;

  constructor(options: ErlenmeyerFlaskGeometryOptions = {}) {
    const silhouette = erlenmeyerFlaskProfile(options);
    super(vesselShell(silhouette, options), options.radialSegments ?? 16);
    this.profile = silhouette;
    this.bodyRadius = options.bodyRadius ?? 1;
    this.height = silhouette.reduce((m, p) => Math.max(m, p.y), 0);
  }
}
