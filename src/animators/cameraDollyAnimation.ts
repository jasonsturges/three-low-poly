import { Camera, Vector3 } from "three";

/**
 * Dolly backward
 *
 * Example:
 * ```
 * dollyAnimation(camera, 5, 3000, () => {
 *   console.log("Dolly animation complete");
 * });
 * ```
 */
export function cameraDollyAnimation(
  camera: Camera,
  distance: number,
  duration: number,
  onComplete?: () => void, // Optional callback
): void {
  const startPos = camera.position.clone();
  const endPos = startPos.clone().add(camera.getWorldDirection(new Vector3()).multiplyScalar(-distance));
  let startTime: number | null = null;

  function animate(time: number): void {
    if (startTime === null) startTime = time;
    const elapsed = time - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      camera.position.copy(endPos);
      if (onComplete) onComplete();
      return;
    }

    // Interpolate position
    camera.position.lerpVectors(startPos, endPos, progress);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
