import { FlorenceFlask, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Florence Flask" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0xe64d4d });

  const florenceFlask = new FlorenceFlask();
  scene.add(florenceFlask);
  centerObject(florenceFlask);

  return () => {
    florenceFlask.geometry.dispose();
    florenceFlask.material.dispose();
    dispose();
  };
}