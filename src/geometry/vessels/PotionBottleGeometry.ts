import { LatheGeometry, Vector2 } from "three";
import {
  potionBottleProfile,
  vesselShell,
  type PotionBottleProfileOptions,
  type VesselShellOptions,
} from "./vesselProfiles";

export interface PotionBottleGeometryOptions extends PotionBottleProfileOptions, VesselShellOptions {
  /** Circumference segments — the low-poly knob. Defaults to `20`. */
  radialSegments?: number;
}

/**
 * Potion bottle — a small, bulbous glass bottle with a narrow neck and a rolled rim, corked by
 * {@link PotionBottle}.
 *
 * A lathe of {@link vesselShell} over {@link potionBottleProfile}; the silhouette is exposed as `.profile`
 * for the fill and for seating a cork. Local frame: base on Y=0, opening up +Y.
 */
export class PotionBottleGeometry extends LatheGeometry {
  readonly profile: Vector2[];
  readonly radius: number;
  readonly height: number;

  constructor(options: PotionBottleGeometryOptions = {}) {
    const silhouette = potionBottleProfile(options);
    // A subtle rim so the opening stays close to the neck.
    super(vesselShell(silhouette, { ...options, rim: options.rim ?? 0.15 }), options.radialSegments ?? 20);
    this.profile = silhouette;
    this.radius = options.radius ?? 1;
    this.height = silhouette.reduce((m, p) => Math.max(m, p.y), 0);
  }
}
