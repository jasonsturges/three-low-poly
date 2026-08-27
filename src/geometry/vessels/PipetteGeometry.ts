import { LatheGeometry, Vector2 } from "three";
import { pipetteProfile, vesselShell, type PipetteProfileOptions, type VesselShellOptions } from "./vesselProfiles";

export interface PipetteGeometryOptions extends PipetteProfileOptions, VesselShellOptions {
  /** Circumference segments — the low-poly knob. Defaults to `16`. */
  radialSegments?: number;
}

/**
 * Pipette — a thin tube tapering through a cone to a point at the base, with a rolled rim.
 *
 * A lathe of {@link vesselShell} over {@link pipetteProfile}; the silhouette is exposed as `.profile` for
 * the fill. Local frame: tip on Y=0, opening up +Y.
 */
export class PipetteGeometry extends LatheGeometry {
  readonly profile: Vector2[];
  readonly radius: number;
  readonly height: number;

  constructor(options: PipetteGeometryOptions = {}) {
    const silhouette = pipetteProfile(options);
    super(vesselShell(silhouette, options), options.radialSegments ?? 16);
    this.profile = silhouette;
    this.radius = options.radius ?? 0.1;
    this.height = silhouette.reduce((m, p) => Math.max(m, p.y), 0);
  }
}
