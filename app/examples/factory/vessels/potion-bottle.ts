import { Mesh, MeshStandardMaterial } from "three";
import { ColorPalette, PotionBottleGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Potion Bottle" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  // Groups: 0 bottle, 1 cork, 2 liquid.
  const materials = [
    new MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.3,
    }),
    new MeshStandardMaterial({ color: 0x8b4513, roughness: 1.0 }),
    new MeshStandardMaterial({
      color: ColorPalette.PINK_SHERBET,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    }),
  ];

  const potionBottle = new Mesh(new PotionBottleGeometry(), materials);
  scene.add(potionBottle);
  centerObject(potionBottle);

  return () => {
    potionBottle.geometry.dispose();
    potionBottle.material.forEach((m) => m.dispose());
    dispose();
  };
}
