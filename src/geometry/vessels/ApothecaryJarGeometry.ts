import { LatheGeometry, Vector2 } from "three";
import {
  apothecaryJarProfile,
  vesselShell,
  type ApothecaryJarProfileOptions,
  type VesselShellOptions,
} from "./vesselProfiles";

export interface ApothecaryJarGeometryOptions extends ApothecaryJarProfileOptions, VesselShellOptions {
  /** Circumference segments — the low-poly knob. Defaults to `20`. */
  radialSegments?: number;
}

/**
 * Apothecary jar — a round, oblong glass jar with a rolled rim, corked by {@link ApothecaryJar}.
 *
 * A lathe of {@link vesselShell} over {@link apothecaryJarProfile}; the silhouette is exposed as `.profile`
 * for the fill and for seating a cork in the rim. Local frame: base on Y=0, opening up +Y.
 */
export class ApothecaryJarGeometry extends LatheGeometry {
  readonly profile: Vector2[];
  readonly radius: number;
  readonly height: number;

  constructor(options: ApothecaryJarGeometryOptions = {}) {
    const silhouette = apothecaryJarProfile(options);
    // A subtle rim by default — a jar mouth, not a fat rolled lip — so the opening stays close to the neck.
    super(vesselShell(silhouette, { ...options, rim: options.rim ?? 0.15 }), options.radialSegments ?? 20);
    this.profile = silhouette;
    this.radius = options.radius ?? 1.5;
    this.height = silhouette.reduce((m, p) => Math.max(m, p.y), 0);
  }
}
