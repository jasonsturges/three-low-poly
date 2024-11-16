import { Camera, Vector3 } from "three";

/**
 * The camera swings back and forth like a pendulum.
 *
 * Examples:
 * ```
 * pendulumAnimation(camera, new THREE.Vector3(0, 5, 5), 0.5, 3000)
 * ```
 */
export function pendulumAnimation(camera: Camera, center: Vector3, radius: number, duration: number): void {
  let startTime: number | null = null;

  function animate(time: number): void {
    if (startTime === null) startTime = time;
    const elapsed = time - startTime;
    const progress = (elapsed / duration) % 1; // Loop indefinitely

    // Calculate pendulum angle
    const angle = (Math.sin(progress * Math.PI * 2) * Math.PI) / 6; // Swing between -30° and +30°
    const x = center.x + radius * Math.sin(angle);
    const z = center.z + radius * Math.cos(angle);

    camera.position.set(x, camera.position.y, z);
    camera.lookAt(center);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
