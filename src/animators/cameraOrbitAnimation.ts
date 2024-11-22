import { Camera, Vector3 } from "three";

/**
 * Orbit around a target
 *
 * Example:
 * ```
 * orbitAnimation(camera, new THREE.Vector3(0, 0, 0), 10, 5000, () => {
 *   console.log("Orbit animation complete");
 * });
 * ```
 */
export function cameraOrbitAnimation(camera: Camera, target: Vector3, radius: number, duration: number, onComplete?: () => void) {
  let startTime: number | null = null

  function animate(time: number) {
    if (!startTime) startTime = time;
    const elapsed = time - startTime;
    const progress = elapsed / duration;

    // Clamp progress to [0, 1]
    if (progress >= 1) {
      if (onComplete) onComplete();
      return;
    }

    // Calculate angle based on progress
    const angle = progress * Math.PI * 2; // Full circle
    const x = target.x + radius * Math.cos(angle);
    const z = target.z + radius * Math.sin(angle);

    camera.position.set(x, camera.position.y, z);
    camera.lookAt(target);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
