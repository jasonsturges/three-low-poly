import { Mesh } from "three";
import { Lantern } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Lantern" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const lantern = new Lantern();
  lantern.position.y = -1;
  scene.add(lantern);

  return () => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    dispose();
  };
}