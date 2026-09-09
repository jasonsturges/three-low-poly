import { Vector3 } from "three";
import type { PathPoint } from "./PathPoint";

/** Sample a straight segment including both endpoints; from and to must differ for a usable tangent. */
export function linePath(from: Vector3, to: Vector3, segments = 1): PathPoint[] {
  const tangent = new Vector3().subVectors(to, from).normalize();

  return Array.from({ length: segments + 1 }, (_, i) => ({
    position: new Vector3().lerpVectors(from, to, i / segments),
    tangent: tangent.clone(),
  }));
}
