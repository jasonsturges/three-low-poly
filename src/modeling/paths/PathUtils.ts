import { Matrix4 } from "three";
import type { PathPoint } from "./PathPoint";

/** Concatenate paths without cloning entries or removing coincident joints. */
export function joinPaths(...paths: PathPoint[][]): PathPoint[] {
  return paths.flat();
}

/** Reverse entry order and clone/negate tangents; position vectors remain shared. */
export function reversePath(path: PathPoint[]): PathPoint[] {
  return path
    .slice()
    .reverse()
    .map((p) => ({ ...p, tangent: p.tangent.clone().negate() }));
}

/** Return transformed position/tangent copies. Tangents use transformDirection; scale metadata is unchanged. */
export function transformPath(path: PathPoint[], matrix: Matrix4): PathPoint[] {
  return path.map((p) => ({
    ...p,
    position: p.position.clone().applyMatrix4(matrix),
    tangent: p.tangent.clone().transformDirection(matrix),
  }));
}
