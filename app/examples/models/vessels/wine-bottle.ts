import { Mesh } from "three";
import { centerObject, WineBottle } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wine Bottle" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0xaecbe8 });

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
