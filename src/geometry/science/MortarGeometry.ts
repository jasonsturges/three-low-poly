import { LatheGeometry, Vector2 } from "three";
import { vesselShell } from "../vessels/vesselProfiles";

export interface MortarGeometryOptions {
  /** Outer radius at the widest point. Defaults to `1.4`. */
  radius?: number;
  /** Overall height, base to rim. Defaults to `1.8`. */
  height?: number;
  /** Base (foot) radius. Defaults to `1`. */
  baseRadius?: number;
  /** Wall thickness — a mortar is thick-walled. Defaults to `0.45`. */
  wallThickness?: number;
  /** Circumference segments — the low-poly knob. Defaults to `16`. */
  radialSegments?: number;
}

/**
 * Mortar — the thick-walled bowl a {@link PestleGeometry} grinds in.
 *
 * A lathe of {@link vesselShell} over the bowl silhouette: the profile climbs the outside, rolls over the
 * rim, and comes back DOWN a real inner wall to an inner floor above the base, closing a solid shell. So
 * the interior normals face inward and the material can be single-sided — `DoubleSide` is no longer
 * load-bearing. The outer silhouette is exposed as `.profile`.
 *
 * Local frame: base on Y=0, centered on X/Z.
 *
 * TODO: a `mortarAndPestle()` factory is the home for the assembled pair — seating the pestle head against
 * the bowl's interior is arithmetic against both profiles, which is a factory's job, not either geometry's.
 */
export class MortarGeometry extends LatheGeometry {
  readonly profile: Vector2[];
  readonly radius: number;
  readonly height: number;

  constructor({
    radius = 1.4,
    height = 1.8,
    baseRadius = 1,
    wallThickness = 0.45,
    radialSegments = 16,
  }: MortarGeometryOptions = {}) {
    const silhouette = [
      new Vector2(0, 0),
      new Vector2(baseRadius, 0),
      new Vector2(radius * 0.857, height * 0.278), // base flare
      new Vector2(radius, height * 0.833), // widest wall
      new Vector2(radius * 0.929, height), // rim
    ];
    super(vesselShell(silhouette, { thickness: wallThickness, roundedRim: false }), radialSegments);
    this.profile = silhouette;
    this.radius = radius;
    this.height = height;
  }
}
