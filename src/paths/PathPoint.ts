import { Vector3 } from "three";

/**
 * A point on a path, and the direction the path is heading there.
 *
 * A path is not just a list of positions. A curve knows its own derivative, and sampling only the
 * positions throws that away — you are then forced to estimate the tangent from the CHORD between
 * neighbours, which is not the tangent. In the interior that error averages out; at the ENDS it does
 * not, and it tilts the end caps by half a segment angle. Carry the tangent.
 *
 * Every generator in this folder hands over its analytic tangent for exactly that reason.
 */
export interface PathPoint {
  position: Vector3;
  tangent: Vector3;
  /**
   * Cross-section scale at this station. Omit for a constant section.
   *
   * A path knows its own THICKNESS the same way it knows its own tangent. A branch generator computes
   * its radius as it *walks*, step by step — it has no idea what its radius is "as a function of t",
   * and forcing it to say so means fighting the generator. So the path carries it.
   */
  scale?: number;
}
