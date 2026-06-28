import { Desk } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Desk" };

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, { cameraPosition: [0, 5, 5] });
  controls.target.set(0, 2, 0);

  const desk = new Desk();
  scene.add(desk);

  return () => {
    desk.geometry.dispose();
    desk.material.forEach((m) => m.dispose());
    dispose();
  };
}