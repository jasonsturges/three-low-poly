import { Mesh } from "three";
import { SpiralTube, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Spiral Tube" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const spiralTube = new SpiralTube();
  scene.add(spiralTube);
  centerObject(spiralTube);

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