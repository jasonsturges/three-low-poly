import { Mausoleum, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Mausoleum" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 0, 10] });

  const mausoleum = new Mausoleum();
  scene.add(mausoleum);
  centerObject(mausoleum);

  return () => {
    mausoleum.geometry.dispose();
    mausoleum.material.forEach((m) => m.dispose());
    dispose();
  };
}