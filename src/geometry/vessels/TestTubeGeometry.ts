import { LatheGeometry, Vector2 } from "three";
import { testTubeProfile, vesselShell, type TestTubeProfileOptions, type VesselShellOptions } from "./vesselProfiles";

export interface TestTubeGeometryOptions extends TestTubeProfileOptions, VesselShellOptions {
  /** Circumference segments — the low-poly knob. Defaults to `32`. */
  radialSegments?: number;
}

/**
 * Test tube — a cylinder closed by a hemisphere as ONE curve, walled to a real glass thickness.
 *
 * A lathe of {@link vesselShell} over {@link testTubeProfile}. The outer silhouette is exposed as
 * `.profile`, so the same curve drives the glass, the liquid inside it ({@link LiquidFillGeometry}), or a
 * measurement. Building the silhouette as a single curve rather than a merged cylinder + hemisphere avoids
 * the shading crease at the join. Local frame: rounded bottom on Y=0, rim up +Y.
 */
export class TestTubeGeometry extends LatheGeometry {
  readonly profile: Vector2[];
  readonly radius: number;
  readonly height: number;

  constructor(options: TestTubeGeometryOptions = {}) {
    const silhouette = testTubeProfile(options);
    super(vesselShell(silhouette, options), options.radialSegments ?? 32);
    this.profile = silhouette;
    this.radius = options.radius ?? 0.2;
    this.height = silhouette.reduce((m, p) => Math.max(m, p.y), 0);
  }
}
