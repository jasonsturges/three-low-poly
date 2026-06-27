import { Mesh } from "three";
import { centerObject, DaySkybox, WineBottle } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wine Bottle" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const skybox = new DaySkybox();
  scene.add(skybox);

  const wineBottle = new WineBottle();
  scene.add(wineBottle);
  centerObject(wineBottle);

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
