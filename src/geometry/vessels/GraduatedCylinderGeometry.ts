import { LatheGeometry, Vector2 } from "three";
import {
  graduatedCylinderProfile,
  vesselShell,
  type GraduatedCylinderProfileOptions,
  type VesselShellOptions,
} from "./vesselProfiles";

export interface GraduatedCylinderGeometryOptions extends GraduatedCylinderProfileOptions, VesselShellOptions {
  /** Circumference segments — the low-poly knob. Defaults to `24`. */
  radialSegments?: number;
}

/**
 * Graduated cylinder — a straight bore on a flared base foot, with a rolled rim.
 *
 * A lathe of {@link vesselShell} over {@link graduatedCylinderProfile}; the silhouette is exposed as
 * `.profile` for the fill. Local frame: base on Y=0, opening up +Y.
 */
export class GraduatedCylinderGeometry extends LatheGeometry {
  readonly profile: Vector2[];
  readonly radius: number;
  readonly height: number;

  constructor(options: GraduatedCylinderGeometryOptions = {}) {
    const silhouette = graduatedCylinderProfile(options);
    super(vesselShell(silhouette, options), options.radialSegments ?? 24);
    this.profile = silhouette;
    this.radius = options.radius ?? 0.35;
    this.height = silhouette.reduce((m, p) => Math.max(m, p.y), 0);
  }
}
