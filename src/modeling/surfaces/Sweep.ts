import { BufferGeometry, Quaternion, ShapeUtils, Vector2, Vector3 } from "three";
import type { PathPoint } from "../paths/PathPoint";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec2,
  type Vec3,
} from "../mesh/GeometryBuffers";

/**
 * Profile placement basis: position + normal * px + binormal * py, scaled by scale.
 * Miter stations can carry nonunit normal/binormal vectors.
 */
export interface Station {
  position: Vector3;
  tangent: Vector3;
  normal: Vector3;
  binormal: Vector3;
  scale?: number;
}

/**
 * Parallel-transport frames from path tangents, removing adjacent coincident positions.
 * Provide a nonempty path with nonzero tangents and a reference that yields a nonzero perpendicular seed.
 *
 * ```ts
 * const stations = transportFrames(arcPath({ radius: 2, startAngle: Math.PI, endAngle: 0 }));
 * const geometry = sweep(circleProfile(0.08, 8), stations);
 * ```
 */
export function transportFrames(path: PathPoint[], reference = new Vector3(0, 0, 1)): Station[] {
  // Remove duplicate joints before constructing frames.
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
  /** Section scale at t ∈ [0, 1] by station index; a station scale takes precedence, including zero. */
  scale?: (t: number) => number;
  /** Triangulate open-end profiles; a failed ear-clipping result falls back to a fan. */
  cap?: boolean;
  /**
 * Stitch the last ring to the first and omit caps; the start station must not be repeated.
 * Spatial closed loops can retain parallel-transport twist (holonomy); no seam correction is applied.
 */
  closed?: boolean;
}

/**
 * Sweep a closed CCW profile in each station’s (normal, binormal) basis.
 * Use at least two stations; tight curvature and collapsed scales can create invalid geometry.
 *
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

  // Preserve a station scale of zero when selecting between the two scale sources.
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

  // Ear clipping supports concave simple profiles; a corner fan requires visibility from its anchor.
  if (cap && !closed) {
    const first = rings[0]!;
    const end = rings[last]!;

    const contour = profile.map(([px, py]) => new Vector2(px, py));
    const faces = ShapeUtils.triangulateShape(contour, []);

    // Orient cap triangles to match the authored profile winding.
    let twice = 0;
    for (let j = 0; j < sides; j++) {
      const a = profile[j]!;
      const b = profile[(j + 1) % sides]!;
      twice += a[0] * b[1] - b[0] * a[1];
    }
    const flip = twice < 0;

    if (faces.length > 0) {
      for (const [a, b, c] of faces) {
        const [i0, i1, i2] = flip ? [a!, c!, b!] : [a!, b!, c!];
        pushTriangle(buffers, [first[i0]!, first[i2]!, first[i1]!], undefined); // reversed: faces back
        pushTriangle(buffers, [end[i0]!, end[i1]!, end[i2]!], undefined);
      }
    } else {
      // Fan fallback can cross a concave outline; callers must validate the resulting cap.
      for (let j = 1; j < sides - 1; j++) {
        pushTriangle(buffers, [first[0]!, first[j + 1]!, first[j]!], undefined);
        pushTriangle(buffers, [end[0]!, end[j]!, end[j + 1]!], undefined);
      }
    }
  }

  return toBufferGeometry(buffers);
}
