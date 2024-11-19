import { Vector3 } from "three";

/**
 * Geometric and mathematical role of the vectors as axes in 3D space.
 *
 * Example usages:
 *
 * Defining a geometry's up vector:
 * ```
 * const upVector = Axis.Z; // Set the Z-axis as the "up" direction
 * object.up.copy(upVector);
 * ```
 *
 * Rotating or Orienting an Object
 * ```
 * const axis = Axis.XY; // Diagonal upward
 * object.lookAt(object.position.clone().add(axis));
 * ```
 *
 * Rotate around axis:
 * ```
 * const angle = Math.PI / 4; // 45-degree rotation
 * const rotationAxis = Axis.Y; // Rotate around the Y-axis
 *
 * object.rotateOnAxis(rotationAxis, angle);
 * ```
 *
 * Scaling along an axis:
 * ```
 * const scalingAxis = Axis.XZ; // Scale equally along X and Z
 * const scaleFactor = 2;
 *
 * object.scale.multiply(scalingAxis.clone().multiplyScalar(scaleFactor));
 * ```
 *
 * Aligning a Camera
 * ```
 * const cameraAxis = Axis.XZ; // Align the camera diagonally on the XZ plane
 *
 * camera.lookAt(camera.position.clone().add(cameraAxis));
 * ```
 *
 * Directional lighting
 * ```
 * const lightDirection = Axis.YZ; // Diagonal light along Y and Z axes
 * directionalLight.position.copy(lightDirection.clone().multiplyScalar(10));
 * ```
 *
 * Aligning an Object
 * ```
 * const axis = Axis.X; // Align object to the X-axis
 * object.lookAt(object.position.clone().add(axis));
 * ```
 *
 * Spawning objects along an axis
 * ```
 * const spawnAxis = Axis.XZ; // Arrange objects diagonally on XZ
 * const count = 10;
 * const spacing = 5;
 *
 * for (let i = 0; i < count; i++) {
 *   const position = spawnAxis.clone().multiplyScalar(i * spacing);
 *   const newObject = object.clone();
 *   newObject.position.copy(position);
 *   scene.add(newObject);
 * }
 * ```
 *
 * Vector projections
 * ```
 * const vector = new Vector3(3, 5, 7);
 * const projectionAxis = Axis.Z; // Project the vector onto the Z-axis
 *
 * const projection = vector.clone().projectOnVector(projectionAxis);
 * ```
 *
 * Plane definitions
 * ```
 * const normal = Axis.Y; // Y-axis is the normal for a horizontal plane
 * const distanceFromOrigin = 5;
 *
 * const plane = new THREE.Plane(normal, distanceFromOrigin);
 * ```
 *
 * Plane intersections
 * ```
 * const planeNormal = Axis.Y; // Define a plane normal (horizontal plane)
 * const plane = new THREE.Plane(planeNormal);
 *
 * const rayDirection = Axis.Z; // Ray pointing along Z-axis
 * const rayOrigin = new Vector3(0, 5, 0);
 * const ray = new THREE.Ray(rayOrigin, rayDirection);
 *
 * // Find intersection point
 * const intersectionPoint = new Vector3();
 * plane.intersectLine(new THREE.Line3(rayOrigin, rayOrigin.clone().add(rayDirection)), intersectionPoint);
 * ```
 *
 * Defining bounds
 * ```
 * const boundsAxis = Axis.XY; // Restrict an object’s movement within XY bounds
 * const maxBounds = 10;
 *
 * object.position.clamp(
 *   new Vector3(-maxBounds, -maxBounds, -Infinity),
 *   new Vector3(maxBounds, maxBounds, Infinity)
 * );
 * ```
 *
 * Procedural Geometry
 * ```
 * const vertex = new Vector3(0, 0, 0);
 * const axis = Axis.XZ; // Diagonal axis on XZ plane
 *
 * const offset = axis.clone().multiplyScalar(5);
 * vertex.add(offset); // Move vertex in axis
 * geometry.vertices.push(vertex);
 * ```
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
