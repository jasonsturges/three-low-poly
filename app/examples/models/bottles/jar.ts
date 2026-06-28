import { Jar, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Jar" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const jar = new Jar();
  scene.add(jar);
  centerObject(jar);

  return () => {
    jar.geometry.dispose();
    jar.material.forEach((m) => m.dispose());
    dispose();
  };
}