import { Vector3 } from "three";
import type { PathPoint } from "./PathPoint";

/**
 * A straight run.
 *
 * Zero curvature — which is precisely where Frenet frames are undefined, and where parallel transport
 * simply carries the frame on without rotating it. A straight leg under an arch is this.
 */
export function linePath(from: Vector3, to: Vector3, segments = 1): PathPoint[] {
  const tangent = new Vector3().subVectors(to, from).normalize();

  return Array.from({ length: segments + 1 }, (_, i) => ({
    position: new Vector3().lerpVectors(from, to, i / segments),
    tangent: tangent.clone(),
  }));
}
