import { LatheGeometry, Vector2 } from "three";
import {
  vesselShell,
  wineBottleProfile,
  type VesselShellOptions,
  type WineBottleProfileOptions,
} from "./vesselProfiles";

export interface WineBottleGeometryOptions extends WineBottleProfileOptions, VesselShellOptions {
  /** Circumference segments — the low-poly knob. Defaults to `20`. */
  radialSegments?: number;
}

/**
 * Wine bottle — a straight body, rounded shoulder, and long neck, as glass with a rolled rim; corked by
 * {@link WineBottle}.
 *
 * A lathe of {@link vesselShell} over {@link wineBottleProfile}; the silhouette is exposed as `.profile`
 * for the fill and for seating a cork. Local frame: base on Y=0, opening up +Y.
 */
export class WineBottleGeometry extends LatheGeometry {
  readonly profile: Vector2[];
  readonly radius: number;
  readonly height: number;

  constructor(options: WineBottleGeometryOptions = {}) {
    const silhouette = wineBottleProfile(options);
    super(vesselShell(silhouette, { ...options, rim: options.rim ?? 0.12 }), options.radialSegments ?? 20);
    this.profile = silhouette;
    this.radius = options.radius ?? 0.5;
    this.height = silhouette.reduce((m, p) => Math.max(m, p.y), 0);
  }
}
