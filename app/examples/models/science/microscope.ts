import { Mesh } from "three";
import { Microscope, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Microscope" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const microscope = new Microscope();
  scene.add(microscope);
  centerObject(microscope);

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