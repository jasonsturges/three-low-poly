import { BufferGeometry, Quaternion, Vector3 } from "three";
import type { PathPoint } from "../paths/PathPoint";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec2,
  type Vec3,
} from "../utils/GeometryBuffers";

/** A station on the path: where we are, how the cross-section is oriented there, and how big it is. */
export interface Station {
  position: Vector3;
  tangent: Vector3;
  normal: Vector3;
  binormal: Vector3;
  scale?: number;
}

/**
 * Carry a stable frame along a path by parallel transport.
 *
 * The obvious approach — Frenet frames, which Three's `TubeGeometry` uses — derives the normal from
 * the path's *curvature*. That fails where it matters most: a straight run has zero curvature, so its
 * normal is undefined, and at an inflection the normal flips 180° and the cross-section snaps over.
 * That is the twisting everyone hits with `TubeGeometry` and cannot explain.
 *
 * Parallel transport asks a different question. Rather than deriving the frame from the curve, it
 * *carries* the previous frame forward, rotating it by the minimum amount needed to keep up with the
 * tangent. A straight run rotates it by nothing at all, which is exactly right — the frame never spins
 * unless the path actually makes it. Measured on a curling path, Frenet spun the section 109× more.
 *
 * @example
 * ```ts
 * const stations = transportFrames(arcPath({ radius: 2, startAngle: Math.PI, endAngle: 0 }));
 * const geometry = sweep(circleProfile(0.08, 8), stations);
 * ```
 */
export function transportFrames(path: PathPoint[], reference = new Vector3(0, 0, 1)): Station[] {
  // Composing a path — line, then arc, then line — lands duplicate points at the joints. A zero-length
  // step has no direction, so its frame collapses. And Three hides it: `normalize()` divides by
  // `length() || 1`, so a zero vector comes back as a zero vector rather than as an error. The mesh is
  // quietly wrong and nothing tells you. Drop them.
  const points = path.filter(
    (p, i) => i === 0 || p.position.distanceToSquared(path[i - 1]!.position) > 1e-12,
  );

  const tangents = points.map((p) => p.tangent.clone().normalize());

  // Seed the first normal from a reference direction, projected perpendicular to the tangent.
  let normal = reference.clone().sub(tangents[0]!.clone().multiplyScalar(reference.dot(tangents[0]!)));
  if (normal.lengthSq() < 1e-8) {
    // The reference happened to lie along the path. Any other axis will do.
    normal = new Vector3(1, 0, 0).sub(tangents[0]!.clone().multiplyScalar(tangents[0]!.x));
  }
  normal.normalize();

  const stations: Station[] = [];
  const axis = new Vector3();
  const rotation = new Quaternion();

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      axis.crossVectors(tangents[i - 1]!, tangents[i]!);

      if (axis.lengthSq() > 1e-12) {
        const angle = Math.acos(Math.min(1, Math.max(-1, tangents[i - 1]!.dot(tangents[i]!))));
        rotation.setFromAxisAngle(axis.normalize(), angle);
        normal.applyQuaternion(rotation);
      }
      // Straight run: the tangents are parallel, so the normal is carried untouched. No twist.

      normal.sub(tangents[i]!.clone().multiplyScalar(normal.dot(tangents[i]!))).normalize();
    }

    stations.push({
      position: points[i]!.position.clone(),
      tangent: tangents[i]!.clone(),
      normal: normal.clone(),
      binormal: new Vector3().crossVectors(tangents[i]!, normal).normalize(),
      scale: points[i]!.scale,
    });
  }

  return stations;
}

export interface SweepOptions {
  /**
   * Cross-section scale along the path, `t` running 0 → 1. A station carrying its own `scale` wins.
   *
   * Three's sweep cannot vary the section at all, and this is what a tapered iron scroll, a horn, and a
   * dissolving smoke trail all require.
   */
  scale?: (t: number) => number;
  /** Cap the two ends. Only correct for a convex profile. Defaults to `true`. */
  cap?: boolean;
  /**
   * Close the loop — stitch the last ring back to the first, and emit no caps.
   *
   * A ring has no ends, so capping it would put a disc *inside* it. Do not repeat the start point: the
   * wrap is what closes it.
   *
   * Parallel transport around a PLANAR loop comes home exactly and the seam is invisible. Around a loop
   * that leaves its plane it generally does not — a residual twist accumulates (holonomy) and the last
   * ring meets the first rotated by some angle. That is a property of the loop, not a bug. Scrollwork
   * is planar, so rings, C-scrolls and volutes are always fine.
   */
  closed?: boolean;
}

/**
 * Carry a closed 2D profile along a path, stitching consecutive rings into quads.
 *
 * The operation behind nearly every curved thing: arches, buttresses, curved railings, bent tubing,
 * corkscrews, wrought iron scrollwork, tree branches, and stylized motion trails. One operation, all of
 * them — the path and the profile are independent, and neither knows the other exists.
 *
 * `profile` is the cross-section in each station's own `(normal, binormal)` plane, wound
 * counter-clockwise. The frames do the hard work; this is just stitching.
 *
 * @example
 * ```ts
 * // A wrought iron tube arching over a gate — swap the profile for a rectangle and it is masonry.
 * const path = joinPaths(
 *   linePath(new Vector3(-2, 0, 0), new Vector3(-2, 2, 0), 2),
 *   transformPath(arcPath({ radius: 2, startAngle: Math.PI, endAngle: 0 }), translate),
 *   linePath(new Vector3(2, 2, 0), new Vector3(2, 0, 0), 2),
 * );
 *
 * const geometry = sweep(circleProfile(0.08, 8), transportFrames(path));
 * ```
 */
export function sweep(
  profile: Vec2[],
  stations: Station[],
  { scale = () => 1, cap = true, closed = false }: SweepOptions = {},
): BufferGeometry {
  const buffers = createGeometryBuffers();
  const sides = profile.length;
  const last = stations.length - 1;

  // Place the profile in each station's frame -> a ring of 3D points.
  // A station that carries its own scale wins: the path knows its thickness better than any formula.
  const rings: Vec3[][] = stations.map((s, i) => {
    const k = s.scale ?? scale(last === 0 ? 0 : i / last);
    return profile.map(([px, py]) => {
      const p = s.position
        .clone()
        .addScaledVector(s.normal, px * k)
        .addScaledVector(s.binormal, py * k);
      return [p.x, p.y, p.z] as Vec3;
    });
  });

  // Stitch ring i to the next. A closed loop wraps the final ring back onto the first.
  const bands = closed ? rings.length : last;

  for (let i = 0; i < bands; i++) {
    const a = rings[i]!;
    const b = rings[(i + 1) % rings.length]!;

    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % sides;
      // u runs around the profile, v runs along the path — the classic tube layout.
      pushQuad(
        buffers,
        [a[j]!, a[k]!, b[k]!, b[j]!],
        undefined, // swept faces are slanted — derive the normal from the winding
        [
          [j / sides, i / last],
          [(j + 1) / sides, i / last],
          [(j + 1) / sides, (i + 1) / last],
          [j / sides, (i + 1) / last],
        ],
      );
    }
  }

  // Flat caps, fanned from the profile's first corner — correct for any convex section. A section that
  // tapers to nothing needs no cap: it is already a point. Neither does a ring: it has no ends.
  if (cap && !closed) {
    const first = rings[0]!;
    const end = rings[last]!;

    for (let j = 1; j < sides - 1; j++) {
      pushTriangle(buffers, [first[0]!, first[j + 1]!, first[j]!], undefined); // reversed: faces back
      pushTriangle(buffers, [end[0]!, end[j]!, end[j + 1]!], undefined);
    }
  }

  return toBufferGeometry(buffers);
}
