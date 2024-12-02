import { Camera, Vector3 } from "three";

/**
 * The camera swings back and forth like a pendulum.
 *
 * Example:
 * ```
 * cameraPendulumAnimation(camera, new THREE.Vector3(0, 5, 5), 0.5, 9000, 3, () => {
 *   console.log("Pendulum animation complete");
 * });
 * ```
 */
export function cameraPendulumAnimation(
  camera: Camera,
  center: Vector3,
  radius: number,
  duration: number,
  oscillations: number,
  onComplete?: () => void,
): void {
  let startTime: number | null = null;
  let oscillationCount = 0;

  function animate(time: number): void {
    if (startTime === null) startTime = time;
    const elapsed = time - startTime;

    // Calculate progress through a single oscillation
    const oscillationDuration = duration / oscillations;
    const progress = (elapsed % oscillationDuration) / oscillationDuration;

    // Calculate pendulum angle
    const angle = (Math.sin(progress * Math.PI * 2) * Math.PI) / 6; // Swing between -30° and +30°
    const x = center.x + radius * Math.sin(angle);
    const z = center.z + radius * Math.cos(angle);

    camera.position.set(x, camera.position.y, z);
    camera.lookAt(center);

    // Increment oscillation count when completing a cycle
    if (elapsed >= (oscillationCount + 1) * oscillationDuration) {
      oscillationCount++;
    }

    // Stop after the specified number of oscillations
    if (oscillationCount >= oscillations) {
      if (onComplete) onComplete();
      return;
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
