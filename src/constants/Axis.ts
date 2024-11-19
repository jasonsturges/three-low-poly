import { Vector3 } from "three";

/**
 * Geometric and mathematical role of the vectors as axes in 3D space.
 *
 * Example usages:
 *
 * Rotating or Orienting an Object
 * ```
 * const axis = Axis.XY; // Diagonal upward
 * object.lookAt(object.position.clone().add(axis));
 * ```
 *
 * Procedural Geometry
 * ```
 * const vertex = new Vector3(0, 0, 0);
 * const axis = Axis.XZ; // Diagonal direction on XZ plane
 *
 * const offset = axis.clone().multiplyScalar(5);
 * vertex.add(offset); // Move vertex in axis
 * geometry.vertices.push(vertex);
 * ```
 *
 */
export const Axis = {
  X: new Vector3(1, 0, 0),
  Y: new Vector3(0, 1, 0),
  Z: new Vector3(0, 0, 1),
  XY: new Vector3(1, 1, 0).normalize(),
  XZ: new Vector3(1, 0, 1).normalize(),
  YZ: new Vector3(0, 1, 1).normalize(),
  XYZ: new Vector3(1, 1, 1).normalize(),
};
