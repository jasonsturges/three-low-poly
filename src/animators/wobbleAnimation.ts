import { Camera, Vector3 } from "three";

/**
 * Add a slight random wobble for intensity or realism (e.g., during an explosion).
 *
 * Example:
 * ```
 * wobbleAnimation(camera, 0.5, 1000, () => {
 *   console.log("Wobble animation complete");
 * });
 * ```
 */
export function wobbleAnimation(camera: Camera, intensity: number, duration: number, onComplete?: () => void): void {
  const originalPosition = camera.position.clone();
  let startTime: number | null = null;

  function animate(time: number): void {
    if (startTime === null) startTime = time;
    const elapsed = time - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      camera.position.copy(originalPosition);
      if (onComplete) onComplete();
      return;
    }

    // Add random offset
    const offset = new Vector3(
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity,
    );
    camera.position.copy(originalPosition).add(offset);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
