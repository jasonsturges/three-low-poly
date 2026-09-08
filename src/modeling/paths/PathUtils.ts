import { Matrix4 } from "three";
import type { PathPoint } from "./PathPoint";

/**
 * Join paths end to end — a line, then an arc, then a line, and you have an archway.
 *
 * Coincident points at the joints are left alone. `transportFrames` drops them, because a zero-length
 * step has no direction and its frame would collapse.
 */
export function joinPaths(...paths: PathPoint[][]): PathPoint[] {
  return paths.flat();
}

/** Reverse a path — the stations run backwards and every tangent turns around with them. */
export function reversePath(path: PathPoint[]): PathPoint[] {
  return path
    .slice()
    .reverse()
    .map((p) => ({ ...p, tangent: p.tangent.clone().negate() }));
}

/**
 * Move a path — rotate it into a wall, drop a ring between two pickets, stand a scroll on its edge.
 *
 * Positions transform by the matrix; tangents transform as DIRECTIONS, so translation does not move
 * them and they come out still pointing the right way.
 */
export function transformPath(path: PathPoint[], matrix: Matrix4): PathPoint[] {
  return path.map((p) => ({
    ...p,
    position: p.position.clone().applyMatrix4(matrix),
    tangent: p.tangent.clone().transformDirection(matrix),
  }));
}
