import { TeslaCoil, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Tesla Coil" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const teslaCoil = new TeslaCoil();
  scene.add(teslaCoil);
  centerObject(teslaCoil);

  return () => {
    teslaCoil.geometry.dispose();
    teslaCoil.material.forEach((m) => m.dispose());
    dispose();
  };
}