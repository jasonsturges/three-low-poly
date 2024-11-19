import { Vector3 } from "three";

/**
 * Movement or orientation in a specific direction.
 *
 * Example usages:
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
};
