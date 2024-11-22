import { Camera, Vector3 } from "three";

/**
 * The camera flies through a sequence of points, ideal for showcasing specific elements in the scene.
 *
 * Example:
 * ```
 * flythroughAnimation(
 *   camera,
 *   [
 *     new THREE.Vector3(0, 5, 5),
 *     new THREE.Vector3(0, 5, -25.5),
 *     new THREE.Vector3(-20.5, 5, 0),
 *   ],
 *   6000,
 *   () => {
 *     console.log("Flythrough animation complete");
 *   }
 * );
 * ```
 */
export function cameraFlythroughAnimation(camera: Camera, waypoints: Vector3[], duration: number, onComplete?: () => void): void {
  const totalSegments = waypoints.length - 1;
  let startTime: number | null = null;

  function animate(time: number): void {
    if (startTime === null) startTime = time;
    const elapsed = time - startTime;
    const totalProgress = elapsed / duration;

    if (totalProgress >= 1) {
      camera.position.copy(waypoints[waypoints.length - 1]);
      if (onComplete) onComplete();
      return;
    }

    // Determine current segment and progress within it
    const segmentProgress = totalProgress * totalSegments;
    const segmentIndex = Math.floor(segmentProgress);
    const segmentFraction = segmentProgress - segmentIndex;

    const start = waypoints[segmentIndex];
    const end = waypoints[segmentIndex + 1];

    camera.position.lerpVectors(start, end, segmentFraction);
    camera.lookAt(end);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
