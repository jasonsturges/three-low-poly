import { PotionBottle, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Potion Bottle" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const potionBottle = new PotionBottle();
  scene.add(potionBottle);
  centerObject(potionBottle);

  return () => {
    potionBottle.geometry.dispose();
    potionBottle.material.forEach((m) => m.dispose());
    dispose();
  };
}