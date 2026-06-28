import { Mesh } from "three";
import { LeverPanel } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Lever Panel" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const leverPanel = new LeverPanel();
  scene.add(leverPanel);

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