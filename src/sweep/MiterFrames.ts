import { Quaternion, Vector3 } from "three";
import type { PathPoint } from "../paths/PathPoint";
import type { Station } from "./Sweep";

export interface MiterFramesOptions {
  /** Seed direction for the first frame, projected perpendicular to the path. Defaults to `+Z`. */
  reference?: Vector3;
  /**
   * Treat the path as a closed loop — the last point joins back to the first, and both get mitred.
   * Do not repeat the start point.
   */
  closed?: boolean;
  /**
   * Cut plane normal for the **first** station, replacing the perpendicular end frame. Ignored when
   * `closed`, which has no ends.
   *
   * Use this when the path's end lands on a surface rather than in mid-air. A raked member cut square to
   * its own axis meets a flat plate at an angle — one lip buries itself while the opposite lip lifts
   * clear. Pass the plate's normal and the end is cut *to the plate*, flush.
   *
   * Which way it points does not matter; it is oriented to the path.
   */
  startCut?: Vector3;
  /** Cut plane normal for the **last** station. See {@link MiterFramesOptions.startCut}. */
  endCut?: Vector3;
  /**
   * Widen a seat cut so the member keeps a true square cross-section. Defaults to `false`.
   *
   * A slanted cut through a bar is wider than the bar, so there are two things you can preserve and only
   * one of them at a time:
   *
   * - **`false` (default)** — the profile describes the member's **footprint in the cut plane**. The end
   *   face is exactly the profile, so it lands flush on whatever it meets. The true cross-section is off
   *   square by `1 − cos φ`, which is `1.1%` at a 8.5° rake and invisible.
   * - **`true`** — the profile describes the member's **true cross-section**, as real square stock cut at an
   *   angle. Physically faithful, but the end face flares past the surface it lands on, along the lean axis
   *   only: two of a square's four corners push out while the other two stay put.
   *
   * Default to `false` whenever the end is *joining* something, which is nearly always. This does not affect
   * mitred corners, where the widening is mandatory — consecutive segments share one ring there, and without
   * it the joint pinches.
   */
  widenSeatCuts?: boolean;
}

/**
 * Frame a polyline for **mitred** joints — the picture-frame cut.
 *
 * {@link transportFrames} keeps every ring perpendicular to the path, which is right for a smooth curve
 * and wrong for a hard corner: two bars meeting at a vertex both terminate on the same point, so the
 * outside of the corner is a wedge of empty volume and the inside is interpenetration. Extending the bars
 * to overlap trades a gap for a mess of protruding stubs.
 *
 * A real miter cuts both bars on the plane that **bisects** the joint. For an incoming direction `a` and
 * an outgoing `b`, that plane's normal is `normalize(a + b)` — so this returns stations whose *tangent* is
 * the bisector rather than the segment direction, putting each ring in the cut plane. Consecutive segments
 * then share the identical ring and the joint closes exactly, with no overlap and no gap.
 *
 * **The stretch matters as much as the angle.** A slanted cut through a bar is wider than the bar, so a
 * ring merely rotated into the cut plane would pinch the section. {@link sweep} applies `normal` and
 * `binormal` without renormalizing them, so the widening is carried in the `binormal`'s *length* —
 * `1 / cos φ`, where `φ` is the angle between the segment and the cut plane's normal. A 90° corner
 * widens by `√2`, which is exactly a 45° cut through a square bar.
 *
 * Endpoints of an open path get an ordinary perpendicular frame and no stretch, unless
 * {@link MiterFramesOptions.startCut} or {@link MiterFramesOptions.endCut} names a plane to cut them on —
 * the *seat cut*, for an end that lands on a surface instead of in mid-air.
 *
 * **This only solves joints between segments of one path.** A T-junction — a rail butting into a post — has
 * no bisector to share; let those interpenetrate, which is what real ironwork does anyway.
 *
 * @example
 * ```typescript
 * // A mitred square frame, swept as one closed loop.
 * const corners = [a, b, c, d].map((position) => ({ position, tangent: new Vector3() }));
 * const rail = sweep(rectProfile(0.03, 0.02), miterFrames(corners, { closed: true }), { closed: true });
 * ```
 *
 * @example
 * ```typescript
 * // A raked post seat-cut flat at both ends, so it sits flush on horizontal plates.
 * const up = new Vector3(0, 1, 0);
 * const post = sweep(circleProfile(0.015, 4), miterFrames(linePath(foot, head, 2), { startCut: up, endCut: up }));
 * ```
 */
export function miterFrames(
  path: PathPoint[],
  {
    reference = new Vector3(0, 0, 1),
    closed = false,
    startCut,
    endCut,
    widenSeatCuts = false,
  }: MiterFramesOptions = {},
): Station[] {
  // Duplicate points have no direction, and a zero tangent silently normalizes to zero rather than
  // erroring — the mesh comes out quietly wrong. Drop them.
  const points = path.filter(
    (p, i) => i === 0 || p.position.distanceToSquared(path[i - 1]!.position) > 1e-12,
  );
  if (closed && points.length > 1) {
    const first = points[0]!;
    const final = points[points.length - 1]!;
    if (first.position.distanceToSquared(final.position) < 1e-12) points.pop();
  }

  const count = points.length;
  if (count < 2) return [];

  // Direction of the segment leaving each point. For an open path the last point has none, so it
  // borrows the previous segment's.
  const outgoing: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const next = points[(i + 1) % count];
    if (!closed && i === count - 1) {
      outgoing.push(outgoing[i - 1]!.clone());
      continue;
    }
    outgoing.push(next!.position.clone().sub(points[i]!.position).normalize());
  }

  const incoming: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    if (!closed && i === 0) {
      incoming.push(outgoing[0]!.clone());
      continue;
    }
    incoming.push(outgoing[(i - 1 + count) % count]!.clone());
  }

  // Cut-plane normals: the bisector at a corner, the segment direction at an end.
  const cuts = incoming.map((a, i) => {
    const bisector = a.clone().add(outgoing[i]!);
    // A full reversal has no bisector — the two directions cancel. Fall back to the segment.
    return bisector.lengthSq() < 1e-10 ? outgoing[i]!.clone() : bisector.normalize();
  });

  // A seat cut replaces the end's perpendicular plane with one the caller supplies. Orient it along the
  // path, so a single `+Y` serves both ends of a vertical member and the transport below turns by the
  // small angle rather than flipping through 180°.
  const seated = new Set<number>();
  if (!closed) {
    const seat = (supplied: Vector3 | undefined, index: number, direction: Vector3) => {
      if (!supplied || supplied.lengthSq() < 1e-12) return;
      const normal = supplied.clone().normalize();
      cuts[index] = normal.dot(direction) < 0 ? normal.negate() : normal;
      seated.add(index);
    };
    seat(startCut, 0, outgoing[0]!);
    seat(endCut, count - 1, incoming[count - 1]!);
  }

  let normal = reference.clone().sub(cuts[0]!.clone().multiplyScalar(reference.dot(cuts[0]!)));
  if (normal.lengthSq() < 1e-8) {
    normal = new Vector3(1, 0, 0).sub(cuts[0]!.clone().multiplyScalar(cuts[0]!.x));
  }
  normal.normalize();

  const stations: Station[] = [];
  const axis = new Vector3();
  const rotation = new Quaternion();

  for (let i = 0; i < count; i++) {
    const cut = cuts[i]!;

    // Carry the normal from the previous cut plane so rings don't twist relative to each other.
    if (i > 0) {
      axis.crossVectors(cuts[i - 1]!, cut);
      if (axis.lengthSq() > 1e-12) {
        const angle = Math.acos(Math.min(1, Math.max(-1, cuts[i - 1]!.dot(cut))));
        rotation.setFromAxisAngle(axis.normalize(), angle);
        normal.applyQuaternion(rotation);
      }
      normal.sub(cut.clone().multiplyScalar(normal.dot(cut))).normalize();
    }

    // `1 / cos φ` — how much a slanted cut widens the section. The dot product IS cos φ, so this is
    // stable without computing the angle.
    const direction = incoming[i]!;
    const cosPhi = Math.abs(direction.dot(cut));
    // A seat cut takes the profile as its FOOTPRINT in the cut plane, so it is not widened: widening it
    // would flare the end face past the surface it lands on, and along the lean axis only — two of a
    // square's four corners push out while the other two stay put. A mitred corner must always widen,
    // because both segments share the ring.
    const widen = cosPhi > 1e-6 && (widenSeatCuts || !seated.has(i)) ? 1 / cosPhi : 1;

    const frameNormal = normal.clone();
    const frameBinormal = new Vector3().crossVectors(cut, frameNormal).normalize();

    // The widening acts along ONE axis of the cut plane: the direction the member leans, which is where
    // its own direction projects into that plane. Scaling the binormal alone is correct only when
    // `reference` happens to align it with that lean — stretch the wrong axis and the section shears.
    //
    // `sweep` places a profile point at `position + normal * px + binormal * py`, a LINEAR combination,
    // so applying the stretch `I + (widen - 1) * lean ⊗ lean` to BOTH basis vectors stretches every
    // profile point identically. That expresses an anisotropic scale along an arbitrary in-plane axis
    // exactly, in a frame that only has two vectors to say it with.
    const lean = direction.clone().sub(cut.clone().multiplyScalar(direction.dot(cut)));
    if (widen > 1 + 1e-9 && lean.lengthSq() > 1e-12) {
      lean.normalize();
      const stretch = (v: Vector3) => v.addScaledVector(lean, (widen - 1) * lean.dot(v));
      stretch(frameNormal);
      stretch(frameBinormal);
    }

    stations.push({
      position: points[i]!.position.clone(),
      tangent: cut.clone(),
      normal: frameNormal,
      binormal: frameBinormal,
      scale: points[i]!.scale,
    });
  }

  return stations;
}

// TODO: THE MITER TAXONOMY — the six joints this library needs, and where each one stands.
//
// Numbered so code, docs, and studies can cite the same thing. Full write-up, with the measurements behind
// each verdict, in `docs/joining-swept-bars.md`.
//
//   1. PICTURE-FRAME MITER — two members of one path meeting at a corner. Cut plane DERIVED from the path
//      (the bisector). SOLVED: `miterFrames(path, { closed: true })`. Requires equal stock, structurally —
//      consecutive segments share one ring, so one profile.
//
//   2. SEAT CUT — a member landing on a surface. Cut plane SUPPLIED by that surface. SOLVED:
//      `{ startCut, endCut }`. Guard needed: never cut against a plane the member is nearly PARALLEL to, or
//      the `1 / |d · n|` widening explodes (measured 50x at 88.85°, throwing a bar 0.25 units off).
//
//   3. HIP — two facets meeting where a member reaches a CONVEX CORNER of its boundary, so both bounding
//      planes trim it. Jason's sketch: an arrowhead, ">". NOT EXPRESSIBLE HERE: one station is one ring is
//      one plane. Needs a real trimming capability. A single-plane bisector cut gets a CHAMFER instead —
//      exact at 45°, bounded by half a bar width otherwise. WANTED.
//
//   4. T-JUNCTION / X-CROSSING — a member butting into or crossing another. No bisector to share, so no
//      miter applies. Deliberately NOT mitered: bury the end (partially, never flush — coplanar co-facing
//      surfaces z-fight) or let them interpenetrate, which is what lead came and ironwork do anyway.
//
//   5. THREE-WAY CORNER — two rails and a post sharing one corner, as in a cube frame. Each end wants a
//      two-facet hip, so it inherits (3)'s limit. Sidestep it: have members SPAN between each other's
//      surfaces, reading contact planes off `computeBoundingBox()` rather than predicting them.
//
//   6. CURVED BOUNDARY — a member terminating on an ARC rather than a plane. There is no flat plane to cut
//      against, so none of the above reaches it. UNSOLVED, and it is what the arched lattice windows
//      actually need. Likely wants pairing with the named arch profiles rather than a new cut.
//
// Plan of record: isolate each of these in its own study first, then implement. `mitred-corner.ts` covers
// (1) and (2) today.
