import { Moon } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Moon" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 0, 15] });

  const moon = new Moon();
  scene.add(moon);

  return () => {
    moon.geometry.dispose();
    moon.material.dispose();
    dispose();
  };
}