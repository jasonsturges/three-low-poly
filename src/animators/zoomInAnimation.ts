import { MathUtils, PerspectiveCamera, Vector3 } from "three";

/**
 * The camera smoothly zooms in toward a target, focusing attention on a specific point,
 * and resets to its original FOV after completion.
 *
 * Example:
 * ```
 * zoomInAnimation(camera, new THREE.Vector3(0, 0, 0), 120, 75, 2000, () => {
 *   console.log("Zoom in animation complete");
 * });
 * ```
 */
export function zoomInAnimation(
  camera: PerspectiveCamera,
  target: Vector3,
  startFov: number,
  endFov: number,
  duration: number,
  onComplete?: () => void,
): void {
  const initialFov = camera.fov; // Store the initial FOV
  camera.fov = startFov;
  camera.updateProjectionMatrix();
  let startTime: number | null = null;

  function animate(time: number): void {
    if (startTime === null) startTime = time;
    const elapsed = time - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      camera.fov = endFov;
      camera.updateProjectionMatrix();
      camera.lookAt(target);

      // Reset FOV to its original value
      camera.fov = initialFov;
      camera.updateProjectionMatrix();
      if (onComplete) onComplete();
      return;
    }

    camera.fov = MathUtils.lerp(startFov, endFov, progress);
    camera.updateProjectionMatrix();
    camera.lookAt(target);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
