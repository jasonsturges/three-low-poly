import { Camera, Vector3 } from "three";

/**
 * The camera spirals upward, perfect for revealing a large scene or structure.
 *
 * Example:
 * ```
 * cameraSpiralAscensionAnimation(camera, new THREE.Vector3(0, 0, 0), 10, 300, 7, 12000, () => {
 *   console.log("Spiral ascension animation complete");
 * });
 * ```
 */
export function cameraSpiralAscensionAnimation(
  camera: Camera,
  center: Vector3,
  radius: number,
  height: number,
  revolutions: number,
  duration: number,
  onComplete?: () => void,
): void {
  let startTime: number | null = null;

  function animate(time: number): void {
    if (startTime === null) startTime = time;
    const elapsed = time - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      if (onComplete) onComplete();
      return;
    }

    const angle = progress * Math.PI * 2 * revolutions; // Total angle covered
    const x = center.x + radius * Math.cos(angle);
    const z = center.z + radius * Math.sin(angle);
    const y = center.y + height * progress;

    camera.position.set(x, y, z);
    camera.lookAt(center);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
