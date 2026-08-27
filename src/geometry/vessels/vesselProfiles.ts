import { Vector2 } from "three";

// Lathe profiles for laboratory glassware, and the liquid that fills any of them.
//
// Pure geometry — numbers in, profile points out. A vessel's SILHOUETTE (its outer wall, bottom to rim) is
// the source of truth: `vesselShell` thickens it into the renderable glass, `fillProfile` cuts the liquid
// from it, and a caller can measure it. Keeping the silhouette first-class is what lets one set of
// functions serve every vessel.

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Silhouettes — the outer wall, bottom to rim start. Exposed as a vessel's `.profile`.
// ---------------------------------------------------------------------------

export interface FlorenceFlaskProfileOptions {
  /** Bulb (sphere) radius. Defaults to `1`. */
  bodyRadius?: number;
  /** Neck radius — the straight tube above the bulb. Defaults to `0.2`. */
  neckRadius?: number;
  /** Neck height, above the bulb's shoulder. Defaults to `1.5`. */
  neckHeight?: number;
  /** Arc stations over the bulb — its smoothness. Defaults to `32`. */
  profileSegments?: number;
}

/**
 * Florence flask silhouette — a sphere opened at the top into a straight neck.
 *
 * The arc runs from the south pole to the latitude where the sphere is exactly as wide as the neck
 * (`asin(neckRadius / bodyRadius)`), so the neck meets the bulb tangentially with no crease. Bulb bottom
 * on Y=0; ends at the rim.
 */
export function florenceFlaskProfile({
  bodyRadius = 1,
  neckRadius = 0.2,
  neckHeight = 1.5,
  profileSegments = 32,
}: FlorenceFlaskProfileOptions = {}): Vector2[] {
  const segments = Math.max(3, profileSegments);
  const thetaTop = neckRadius > 0 ? Math.asin(clamp(neckRadius / bodyRadius, 0, 1)) : 0;
  const points: Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = Math.PI - ((Math.PI - thetaTop) * i) / segments;
    points.push(new Vector2(bodyRadius * Math.sin(theta), bodyRadius * Math.cos(theta) + bodyRadius));
  }
  const shoulderY = points[points.length - 1]!.y;
  if (neckRadius > 0 && neckHeight > 0) points.push(new Vector2(neckRadius, shoulderY + neckHeight));
  return points;
}

export interface ErlenmeyerFlaskProfileOptions {
  /** Body (base) radius — the widest point. Defaults to `1`. */
  bodyRadius?: number;
  /** Neck radius. Defaults to `0.3`. */
  neckRadius?: number;
  /** Body height, before the neck. Defaults to `2.5`. */
  bodyHeight?: number;
  /** Neck height. Defaults to `1`. */
  neckHeight?: number;
}

/**
 * Erlenmeyer flask silhouette — a conical body rising to a straight neck. Base on Y=0; ends at the rim.
 *
 * The base is drawn a touch in from full radius with a small chamfer, so the wall turns up rather than
 * meeting the bottom at a hard rim that catches the light wrongly.
 */
export function erlenmeyerFlaskProfile({
  bodyRadius = 1,
  neckRadius = 0.3,
  bodyHeight = 2.5,
  neckHeight = 1,
}: ErlenmeyerFlaskProfileOptions = {}): Vector2[] {
  return [
    new Vector2(0, 0),
    new Vector2(bodyRadius * 0.875, 0),
    new Vector2(bodyRadius, bodyHeight * 0.04),
    new Vector2(neckRadius, bodyHeight),
    new Vector2(neckRadius, bodyHeight + neckHeight),
  ];
}

export interface TestTubeProfileOptions {
  /** Tube radius. Defaults to `0.2`. */
  radius?: number;
  /** Overall height, rounded bottom to rim. Defaults to `3`. */
  height?: number;
  /** Arc stations over the rounded bottom. Defaults to `16`. */
  profileSegments?: number;
}

/**
 * Test tube silhouette — a cylinder closed by a hemisphere, as ONE curve.
 *
 * A single profile rather than a cylinder merged with half a sphere: a merge leaves two rings of vertices
 * at the join with different normals, so the seam shades as a crease on a tube meant to read as
 * continuous. The hemisphere's centre sits one radius up, so the tube rests on Y=0; ends at the rim.
 */
export function testTubeProfile({ radius = 0.2, height = 3, profileSegments = 16 }: TestTubeProfileOptions = {}): Vector2[] {
  const segments = Math.max(3, profileSegments);
  const points: Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = Math.PI - (Math.PI / 2) * (i / segments); // south pole up to the equator
    points.push(new Vector2(radius * Math.sin(theta), radius * Math.cos(theta) + radius));
  }
  if (height > radius) points.push(new Vector2(radius, height));
  return points;
}

export interface GraduatedCylinderProfileOptions {
  /** Body (bore) radius. Defaults to `0.35`. */
  radius?: number;
  /** Overall height. Defaults to `3`. */
  height?: number;
  /** Base-foot radius — the wider skirt for stability. Defaults to `1.5 ×` the body radius. */
  footRadius?: number;
  /** Foot height. Defaults to `0.08 ×` the height. */
  footHeight?: number;
}

/**
 * Graduated cylinder silhouette — a straight bore rising from a flared base foot. Base on Y=0, ends at the
 * rim. A straight cylinder, not the Erlenmeyer's cone.
 */
export function graduatedCylinderProfile({
  radius = 0.35,
  height = 3,
  footRadius,
  footHeight,
}: GraduatedCylinderProfileOptions = {}): Vector2[] {
  const fr = footRadius ?? radius * 1.5;
  const fh = footHeight ?? height * 0.08;
  return [
    new Vector2(0, 0),
    new Vector2(fr, 0),
    new Vector2(fr, fh * 0.5),
    new Vector2(radius, fh),
    new Vector2(radius, height),
  ];
}

export interface PipetteProfileOptions {
  /** Tube radius. Defaults to `0.1`. */
  radius?: number;
  /** Overall height. Defaults to `3`. */
  height?: number;
  /** Length of the tapering cone tip at the base. Defaults to `0.22 ×` the height. */
  tipLength?: number;
}

/**
 * Pipette silhouette — a very thin tube tapering through a cone to a point at the base. Tip on Y=0, ends at
 * the rim. Like a test tube, but with a conical instead of spherical base.
 */
export function pipetteProfile({ radius = 0.1, height = 3, tipLength }: PipetteProfileOptions = {}): Vector2[] {
  const tl = tipLength ?? height * 0.22;
  return [new Vector2(0, 0), new Vector2(radius, tl), new Vector2(radius, height)];
}

// ---------------------------------------------------------------------------
// Shell — thicken a silhouette into the renderable glass.
// ---------------------------------------------------------------------------

export interface VesselShellOptions {
  /**
   * Wall thickness, in world units. `> 0` builds a full double wall (up the outside, rolled over the rim,
   * down a full inner wall, closed at the bottom) so the vessel reads solid under a single-sided material —
   * right for OPAQUE vessels (a mortar). `0` (the default) leaves a single surface with just a rounded
   * rolled rim — right for TRANSPARENT glass, where a double wall only multiplies the layers to sort. For
   * glass, fake the wall with a fill gap instead ({@link fillProfile}'s `inset`).
   */
  thickness?: number;
  /** Rolled-rim bead thickness, as a fraction of the rim radius — used only when `thickness` is `0`. Defaults to `0.4`. */
  rim?: number;
  /**
   * Round the double wall's rim over a bead (a rolled lip). When `false`, the outer and inner walls meet
   * the rim with a flat edge — right for a plain thick rim like a stone mortar. Only affects `thickness > 0`.
   * Defaults to `true`.
   */
  roundedRim?: boolean;
}

/** Offset a profile inward along its own normal — the inner wall of a shell of the given thickness. */
function offsetInward(profile: Vector2[], thickness: number): Vector2[] {
  const n = profile.length;
  const result: Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = profile[Math.max(0, i - 1)]!;
    const next = profile[Math.min(n - 1, i + 1)]!;
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    // Inward normal: the tangent turned +90°, which points toward the axis for a bottom-to-top profile.
    result.push(new Vector2(Math.max(0.0005, profile[i]!.x - ty * thickness), profile[i]!.y + tx * thickness));
  }
  return result;
}

/** A small rounded bead rolling from the outer rim point over the top to the inner rim point. */
function rimRoll(outer: Vector2, inner: Vector2, segments = 5): Vector2[] {
  const cx = (outer.x + inner.x) / 2;
  const cy = (outer.y + inner.y) / 2;
  const r = Math.hypot(outer.x - inner.x, outer.y - inner.y) / 2 || 1e-4;
  const a0 = Math.atan2(outer.y - cy, outer.x - cx);
  const points: Vector2[] = [];
  for (let i = 1; i < segments; i++) {
    const a = a0 + Math.PI * (i / segments); // sweep π, bulging up over the rim
    points.push(new Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return points;
}

/**
 * A single-surface rolled rim — rounds the top edge over into a lip and STOPS at the inner rim, without
 * traversing down an inner wall. Just enough to give the opening a "top" and kill the hard cut edge.
 */
function rolledRim(radius: number, topY: number, rim: number, segments = 6): Vector2[] {
  if (rim <= 0) return [new Vector2(radius, topY)];
  const thickness = Math.min(rim, 0.9) * radius;
  const bead = thickness / 2;
  const cx = radius - bead;
  const points: Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI; // outer rim (0) → rounded top (π/2) → inner rim (π), then stop
    points.push(new Vector2(cx + bead * Math.cos(a), topY + bead * Math.sin(a)));
  }
  return points;
}

/**
 * Thicken a vessel silhouette into the profile actually lathed.
 *
 * With `thickness > 0` the profile winds up the outside, rolls over the rim, and comes back down a full
 * inner wall to a closed inner bottom — real glass under a single-sided material. With `thickness = 0` it
 * is the bare silhouette with a decorative rolled rim.
 */
export function vesselShell(
  silhouette: Vector2[],
  { thickness = 0, rim = 0.4, roundedRim = true }: VesselShellOptions = {},
): Vector2[] {
  if (silhouette.length < 2) return silhouette;
  const rimTop = silhouette[silhouette.length - 1]!;

  if (thickness > 1e-6) {
    const t = Math.min(thickness, rimTop.x * 0.8);
    const inner = offsetInward(silhouette, t);
    // Rounded lip, or a flat edge straight across to the inner wall (a plain thick rim, e.g. a mortar).
    const bead = roundedRim ? rimRoll(rimTop, inner[inner.length - 1]!) : [];
    return [...silhouette, ...bead, ...inner.slice().reverse()];
  }
  return [...silhouette.slice(0, -1), ...rolledRim(rimTop.x, rimTop.y, rim)];
}

// ---------------------------------------------------------------------------
// Fill — the liquid, cut from a vessel's own silhouette.
// ---------------------------------------------------------------------------

/**
 * The liquid that fills a vessel to a given fraction of its height — derived from the shell's OWN
 * silhouette rather than written per vessel.
 *
 * Take the wall up to the surface, cut it where it actually crosses `fill`, and close it flat across the
 * axis. One function serves every vessel, and the liquid cannot disagree with the glass it sits in because
 * it is the same curve. `fill` is a fraction of the vessel's height, so it means the same on every shape.
 *
 * `inset` shrinks the radius so the liquid clears the inner glass wall and does not z-fight it.
 *
 * Returns `[]` when there is nothing to draw.
 */
export function fillProfile(shell: Vector2[], fill: number, inset = 0.03): Vector2[] {
  if (shell.length < 2) return [];
  const base = shell[0]!.y;
  let top = base;
  for (const p of shell) top = Math.max(top, p.y);
  const level = lerp(base, top, clamp(fill, 0, 1));
  if (level <= base) return [];

  const shrink = 1 - clamp(inset, 0, 0.5);
  const points: Vector2[] = [];
  for (let i = 0; i < shell.length; i++) {
    const p = shell[i]!;
    if (p.y <= level) {
      points.push(new Vector2(p.x * shrink, p.y));
      continue;
    }
    if (i > 0) {
      const prev = shell[i - 1]!;
      const span = p.y - prev.y;
      if (span > 1e-6) {
        const t = (level - prev.y) / span;
        points.push(new Vector2(lerp(prev.x, p.x, t) * shrink, level));
      }
    }
    break;
  }

  const last = points[points.length - 1];
  if (!last) return [];
  if (last.x > 1e-6) points.push(new Vector2(0, last.y)); // flat meniscus, closed across the axis
  return points.length >= 2 ? points : [];
}
