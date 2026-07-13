import { BufferGeometry, Vector3 } from "three";
import type { PathPoint } from "../../paths/PathPoint";
import { circleProfile, rectProfile } from "../../sweep/Profiles";
import { sweep, transportFrames } from "../../sweep/Sweep";
import type { Vec2 } from "../../utils/GeometryBuffers";

export interface ArchGeometryOptions {
  /** Opening width, outer leg to outer leg. Defaults to `4`. */
  span?: number;
  /** Straight rise before the arc springs. Defaults to `2`. */
  legHeight?: number;
  /**
   * Cross-section carried around the arch. Defaults to `"bar"`.
   *
   * The path does not care. A rectangle gives a masonry band; a circle gives wrought iron tubing
   * arching over a gate. Same arc, same frames, same flat base caps — nothing else changes.
   */
  profile?: "bar" | "tube";
  /** Radial depth of the band. Bar only. Defaults to `0.4`. */
  thickness?: number;
  /** Depth out of the arch's plane. Bar only. Defaults to `0.5`. */
  depth?: number;
  /** Radius of the tube. Tube only. Defaults to `0.08`. */
  tubeRadius?: number;
  /** Sides of the tube. `4` gives square tubing, which is what wrought iron actually is. Defaults to `8`. */
  tubeSides?: number;
  /** Smoothness of the arc — the low-poly knob. Defaults to `24`. */
  segments?: number;
  /** Stations along each straight leg. Defaults to `2`. */
  legSegments?: number;
}

/**
 * A round-headed archway — two straight legs rising to a semicircular arc.
 *
 * A swept band, not a filled outline: this is the arch you walk *through*. (For an arched door or a
 * headstone — the same silhouette, filled — see `ArchedSlabGeometry`.)
 *
 * Every segment states its own ANALYTIC tangent. A leg's tangent is simply its direction; the arc's is
 * its derivative, vertical at the springing and horizontal at the crown. That is what lets the base
 * caps sit perfectly flat on the floor. Estimate them from the chords instead and the first cap tilts
 * by half a segment angle, which is the sort of error you fix by nudging a parameter until it looks
 * right without ever learning what was wrong.
 *
 * Set `legHeight: 0` and it is a pure semicircle — still flat on the floor, because the arc supplies a
 * vertical tangent at its springing.
 *
 * Local frame: spans X, rises +Y, and lies in the XY plane.
 *
 * @example
 * ```ts
 * const masonry = new ArchGeometry({ span: 4, legHeight: 2 });
 * const gateway = new ArchGeometry({ profile: "tube", tubeRadius: 0.06, tubeSides: 4 });
 * ```
 */
export class ArchGeometry extends BufferGeometry {
  readonly span: number;
  readonly legHeight: number;
  /** Overall height, crown included. */
  readonly totalHeight: number;

  constructor({
    span = 4,
    legHeight = 2,
    profile = "bar",
    thickness = 0.4,
    depth = 0.5,
    tubeRadius = 0.08,
    tubeSides = 8,
    segments = 24,
    legSegments = 2,
  }: ArchGeometryOptions = {}) {
    super();

    this.span = span;
    this.legHeight = legHeight;
    this.totalHeight = legHeight + span / 2;

    const r = span / 2;
    const path: PathPoint[] = [];

    const UP = new Vector3(0, 1, 0);
    const DOWN = new Vector3(0, -1, 0);

    // Left leg: straight up. Zero curvature — where Frenet frames are undefined and transport is not.
    for (let i = 0; i < legSegments; i++) {
      path.push({
        position: new Vector3(-r, (i / legSegments) * legHeight, 0),
        tangent: UP.clone(),
      });
    }

    // The arc: springs from the left leg, over the crown, and down to the right.
    for (let i = 0; i <= segments; i++) {
      const theta = Math.PI - (i / segments) * Math.PI; // 180° -> 0°
      path.push({
        position: new Vector3(r * Math.cos(theta), legHeight + r * Math.sin(theta), 0),
        tangent: new Vector3(Math.sin(theta), -Math.cos(theta), 0), // the analytic derivative
      });
    }

    // Right leg: straight back down.
    for (let i = 1; i <= legSegments; i++) {
      path.push({
        position: new Vector3(r, legHeight - (i / legSegments) * legHeight, 0),
        tangent: DOWN.clone(),
      });
    }

    // For this planar path the normal comes out as +Z (out of plane) and the binormal as radial, so a
    // rectangle's first axis is the wall's depth and its second is the band's thickness.
    const section: Vec2[] =
      profile === "tube" ? circleProfile(tubeRadius, tubeSides) : rectProfile(thickness, depth);

    this.copy(sweep(section, transportFrames(path)));
  }
}
