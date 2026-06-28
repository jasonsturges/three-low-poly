import { MossyRocks } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Mossy Rocks" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const rocks = new MossyRocks();
  scene.add(rocks);

  return () => {
    rocks.geometry.dispose();
    rocks.material.forEach((m) => m.dispose());
    dispose();
  };
}