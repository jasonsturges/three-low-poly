import { Rocks } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Rocks" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const rocks = new Rocks();
  scene.add(rocks);

  return () => {
    rocks.geometry.dispose();
    rocks.material.dispose();
    dispose();
  };
}