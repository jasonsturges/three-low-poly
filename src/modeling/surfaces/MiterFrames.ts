import { Quaternion, Vector3 } from "three";
import type { PathPoint } from "../paths/PathPoint";
import type { Station } from "./Sweep";

/** Remove adjacent coincident positions; a closed run also removes the repeated endpoint. */
function distinct<T>(items: T[], positionOf: (item: T) => Vector3, closed: boolean): T[] {
  const kept = items.filter(
    (item, i) => i === 0 || positionOf(item).distanceToSquared(positionOf(items[i - 1]!)) > 1e-12,
  );
  if (closed && kept.length > 1) {
    const first = positionOf(kept[0]!);
    const last = positionOf(kept[kept.length - 1]!);
    if (first.distanceToSquared(last) < 1e-12) kept.pop();
  }
  return kept;
}

/** Incoming/outgoing unit edge directions; each open endpoint reuses its sole incident direction. */
function edgeDirections(points: Vector3[], closed: boolean): { incoming: Vector3[]; outgoing: Vector3[] } {
  const count = points.length;

  const outgoing: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    if (!closed && i === count - 1) {
      outgoing.push(outgoing[i - 1]!.clone());
      continue;
    }
    outgoing.push(points[(i + 1) % count]!.clone().sub(points[i]!).normalize());
  }

  const incoming: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    if (!closed && i === 0) {
      incoming.push(outgoing[0]!.clone());
      continue;
    }
    incoming.push(outgoing[(i - 1 + count) % count]!.clone());
  }

  return { incoming, outgoing };
}

/** The bisecting plane at each corner: `normalize(incoming + outgoing)`. */
function cutPlanes(incoming: Vector3[], outgoing: Vector3[]): Vector3[] {
  return incoming.map((a, i) => {
    const bisector = a.clone().add(outgoing[i]!);
    // A full reversal has no bisector — the two directions cancel. Fall back to the segment.
    return bisector.lengthSq() < 1e-10 ? outgoing[i]!.clone() : bisector.normalize();
  });
}

export interface MiterCutsOptions {
  /** Treat the corners as a closed loop, so the last corner joins back to the first. Do not repeat the
   * start point. */
  closed?: boolean;
}

/**
 * Bisecting cut normals for separate members sharing a polyline; duplicate corners are removed.
 * Use matching sections/roll and widenSeatCuts for mirrored members; widening is 1 / cos φ.
 *
 * ```typescript
 * // A picture frame as four separate sticks, each mitered at both ends.
 * const cuts = miterCuts(corners, { closed: true });
 *
 * const sides = corners.map((from, i) => {
 *   const to = corners[(i + 1) % corners.length];
 *   return sweep(
 *     rectProfile(faceWidth, depth),
 *     miterFrames(linePath(from, to, 1), {
 *       startCut: cuts[i],
 *       endCut: cuts[(i + 1) % corners.length],
 *       widenSeatCuts: true,
 *     }),
 *   );
 * });
 * ```
 */
export function miterCuts(corners: Vector3[], { closed = false }: MiterCutsOptions = {}): Vector3[] {
  const points = distinct(corners, (position) => position, closed);
  if (points.length < 2) return [];

  const { incoming, outgoing } = edgeDirections(points, closed);
  return cutPlanes(incoming, outgoing);
}

export interface MiterFramesOptions {
  /** Reference for the initial perpendicular frame; must yield a nonzero seed. */
  reference?: Vector3;
  /**
   * Treat the path as a closed loop — the last point joins back to the first, and both get mitered.
   * Do not repeat the start point.
   */
  closed?: boolean;
  /** First endpoint cut normal, oriented to the path; ignored on a closed path. */
  startCut?: Vector3;
  /** Last endpoint cut normal, oriented to the path; ignored on a closed path. */
  endCut?: Vector3;
  /**
 * false preserves the cut-plane footprint; true preserves section width through widening by 1 / cos φ.
 * Without widening, section-width loss is 1 − cos φ (about 1.1% at 8.5°); internal corners always widen.
 */
  widenSeatCuts?: boolean;
  /**
 * Clamp widening 1 / cos φ to miterLimit; Infinity removes the bound.
 * Clamping shortens the miter without adding bevel topology.
 */
  miterLimit?: number;
}

/**
 * Frame polyline corners on normalize(incoming + outgoing), using positions rather than supplied tangents.
 * Widen along the lean axis by 1 / cos φ (√2 at a 90° corner); matched sections share each corner ring.
 *
 * ```typescript
 * // A mitered square frame, swept as one closed loop.
 * const corners = [a, b, c, d].map((position) => ({ position, tangent: new Vector3() }));
 * const rail = sweep(rectProfile(0.03, 0.02), miterFrames(corners, { closed: true }), { closed: true });
 * ```
 *
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
    miterLimit = 4,
  }: MiterFramesOptions = {},
): Station[] {
  const points = distinct(path, (p) => p.position, closed);
  const count = points.length;
  if (count < 2) return [];

  // Internal corners use bisectors; open endpoints use their segment direction.
  const { incoming, outgoing } = edgeDirections(
    points.map((p) => p.position),
    closed,
  );
  const cuts = cutPlanes(incoming, outgoing);

  // Orient supplied seat normals along the path to avoid a 180° frame reversal.
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
    // Seat widening is optional; internal corners widen to preserve the member section.
    const raw = cosPhi > 1e-6 && (widenSeatCuts || !seated.has(i)) ? 1 / cosPhi : 1;
    const widen = Math.min(raw, Math.max(1, miterLimit));

    const frameNormal = normal.clone();
    const frameBinormal = new Vector3().crossVectors(cut, frameNormal).normalize();

    // Apply I + (widen - 1) * lean ⊗ lean to both profile basis vectors.
    // This stretches position + normal * px + binormal * py along the in-plane lean axis.
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

// Joint identities: seat widening = 1 / |d · n|; crossing-member notch length = width / sin(angle).
// Skew-axis separation is measured along normalize(dA × dB); parallel axes require a separate case.
