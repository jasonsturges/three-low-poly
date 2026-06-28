import { AmbientLight, DirectionalLight, HemisphereLight, Scene } from "three";

/** Removes the default three-light rig that {@link createScene} adds. */
export function clearDefaultLights(scene: Scene) {
  const toRemove: (AmbientLight | DirectionalLight | HemisphereLight)[] = [];
  scene.traverse((object) => {
    if (object instanceof AmbientLight || object instanceof DirectionalLight || object instanceof HemisphereLight) {
      toRemove.push(object);
    }
  });
  for (const light of toRemove) scene.remove(light);
}