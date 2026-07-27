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
 */
export function frameObject(handle: SceneHandle, object: Object3D, { fit = 1.35, retarget = true }: FrameOptions = {}): void {
  const box = new Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const sphere = box.getBoundingSphere(new Sphere());
  const { camera, controls } = handle;

  if (retarget) controls.target.copy(sphere.center);

  // Distance at which a sphere of this radius fills the vertical FOV, padded.
  const fov = (camera.fov * Math.PI) / 180;
  const distance = (sphere.radius * fit) / Math.sin(fov / 2);

  const dir = new Vector3().subVectors(camera.position, controls.target);
  if (dir.lengthSq() === 0) dir.set(0, 0, 1);
  dir.normalize();

  camera.position.copy(sphere.center).add(dir.multiplyScalar(distance));
  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  controls.update();
}
