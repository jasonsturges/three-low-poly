import { Box3, Sphere, Vector3 } from "three";
import type { Object3D } from "three";
import type { SceneHandle } from "./createScene";

export interface FrameOptions {
  /**
   * Padding on the fit distance. `1` frames the bounding sphere edge-to-edge;
   * larger leaves margin around the object. Defaults to `1.35`.
   */
  fit?: number;
  /**
   * Point the orbit target at the object's center so it stays dead-centered as
   * you orbit. Defaults to `true`. Set `false` to keep orbiting the origin
   * (useful in grid/origin mode).
   */
  retarget?: boolean;
  /**
   * Dolly the camera to the fit distance. Defaults to `true`.
   *
   * Set `false` to follow the object *without* re-fitting: the target and the
   * camera translate by the same vector, so the view direction and the viewer's
   * own zoom both survive and only the centering changes. That is what a rebuild
   * wants — a geometry whose origin is not its center moves as its dials change,
   * and re-fitting on every change would snap the zoom back.
   */
  dolly?: boolean;
}

/**
 * Frame the *camera* to an object — the isolation-lab complement to
 * {@link centerObject}. Where `centerObject` moves the object to the orbit
 * point, this moves the camera to the object and (by default) aims the orbit
 * target at its center, so any model — whatever its size or where it sits — fills
 * the viewport and orbits perfectly, with no per-example `cameraPosition` tuning.
 *
 * Keeps the current view *direction* and only dollies along it, so calling this
 * after setting an initial `cameraPosition` preserves your chosen angle. Also
 * refits the near/far planes to the object's scale.
 *
 * The two halves are independently switchable. `retarget` aims the orbit point;
 * `dolly` moves the camera to fit. Call it once at setup to frame, then again
 * with `{ dolly: false }` after each rebuild to keep it framed.
 */
export function frameObject(
  handle: SceneHandle,
  object: Object3D,
  { fit = 1.35, retarget = true, dolly = true }: FrameOptions = {},
): void {
  const box = new Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const sphere = box.getBoundingSphere(new Sphere());
  const { camera, controls } = handle;
  let distance: number;

  if (dolly) {
    if (retarget) controls.target.copy(sphere.center);

    // Distance at which a sphere of this radius fills the vertical FOV, padded.
    const fov = (camera.fov * Math.PI) / 180;
    distance = (sphere.radius * fit) / Math.sin(fov / 2);

    const dir = new Vector3().subVectors(camera.position, controls.target);
    if (dir.lengthSq() === 0) dir.set(0, 0, 1);
    dir.normalize();

    camera.position.copy(sphere.center).add(dir.multiplyScalar(distance));
  } else {
    // Translating both by the same vector leaves the direction and the distance
    // untouched, so the viewer's zoom survives and only the centering changes.
    if (retarget) {
      const delta = new Vector3().subVectors(sphere.center, controls.target);
      controls.target.add(delta);
      camera.position.add(delta);
    }
    distance = camera.position.distanceTo(controls.target);
  }

  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  controls.update();
}
