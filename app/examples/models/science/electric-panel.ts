import { Mesh } from "three";
import { ElectricPanel } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Electric Panel" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const electricPanel = new ElectricPanel();
  scene.add(electricPanel);

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