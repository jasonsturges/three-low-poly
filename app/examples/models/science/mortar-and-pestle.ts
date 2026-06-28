import { Mesh } from "three";
import { MortarAndPestle, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Mortar and Pestle" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const mortarAndPestle = new MortarAndPestle();
  scene.add(mortarAndPestle);
  centerObject(mortarAndPestle);

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