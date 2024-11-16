import { Vector3 } from "three";

/**
 * Examples
 *
 * Moving an Object Along a Direction
 * ```
 * const speed = 1; // Movement speed
 * const direction = Direction.FORWARD; // Choose a direction
 *
 * object.position.add(direction.clone().multiplyScalar(speed * deltaTime));
 * ```
 *
 * Snapping Positions to a Direction
 * ```
 * const targetPosition = new Vector3(5, 0, 3);
 * const snapDirection = Direction.UP; // Align upwards
 *
 * object.position.copy(targetPosition.clone().add(snapDirection.clone().multiplyScalar(10)));
 * ```
 *
 * Rotating or Orienting an Object
 * ```
 * const targetDirection = Direction.XY; // Diagonal upward
 * object.lookAt(object.position.clone().add(targetDirection));
 * ```
 *
 * Procedural Geometry
 * ```
 * const vertex = new Vector3(0, 0, 0);
 * const direction = Direction.XZ; // Diagonal direction on XZ plane
 *
 * const offset = direction.clone().multiplyScalar(5);
 * vertex.add(offset); // Move vertex in direction
 * geometry.vertices.push(vertex);
 * ```
 *
 * Animating Along a Direction
 * ```
 * const distance = 10; // Total distance to travel
 * const duration = 2; // Animation duration in seconds
 * const startPosition = object.position.clone();
 * const targetPosition = startPosition.clone().add(Direction.BACKWARD.clone().multiplyScalar(distance));
 *
 * let elapsed = 0;
 * function animate(deltaTime) {
 *   elapsed += deltaTime;
 *   const t = Math.min(elapsed / duration, 1); // Normalize time to [0, 1]
 *   object.position.lerpVectors(startPosition, targetPosition, t);
 * }
 * ```
 *
 * Shader Uniforms
 * ```
 * material.uniforms.uDirection.value = Direction.FORWARD; // Use as light or flow direction
 * ```
 *
 * Particle Systems
 * ```
 * particles.forEach(particle => {
 *   particle.velocity.add(Direction.FORWARD.clone().multiplyScalar(0.1));
 * });
 * ```
 *
 * Directional Raycasting
 * ```
 * const rayOrigin = new Vector3(0, 0, 0);
 * const rayDirection = Direction.FORWARD;
 * const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);
 *
 * // Find intersected objects
 * const intersects = raycaster.intersectObjects(scene.children);
 * ```
 *
 * Physics Forces
 * ```
 * const forceDirection = Direction.UP; // Push upwards
 * const forceMagnitude = 50;
 *
 * rigidBody.applyForce(forceDirection.clone().multiplyScalar(forceMagnitude));
 * ```
 */
export const Direction = {
  UP: new Vector3(0, 1, 0),
  DOWN: new Vector3(0, -1, 0),
  LEFT: new Vector3(-1, 0, 0),
  RIGHT: new Vector3(1, 0, 0),
  FORWARD: new Vector3(0, 0, 1),
  BACKWARD: new Vector3(0, 0, -1),
  X: new Vector3(1, 0, 0),
  Y: new Vector3(0, 1, 0),
  Z: new Vector3(0, 0, 1),
  XY: new Vector3(1, 1, 0).normalize(),
  XZ: new Vector3(1, 0, 1).normalize(),
  YZ: new Vector3(0, 1, 1).normalize(),
  XYZ: new Vector3(1, 1, 1).normalize(),
};
