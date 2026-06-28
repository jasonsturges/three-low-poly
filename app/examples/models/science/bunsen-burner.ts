import { Mesh } from "three";
import { BunsenBurner } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Bunsen Burner" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const bunsenBurner = new BunsenBurner();
  scene.add(bunsenBurner);

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