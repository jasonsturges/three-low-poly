import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { TeslaCoilGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Tesla Coil" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  // Group 0 is the base, group 1 the coil.
  const materials = [
    new MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.5 }),
    new MeshStandardMaterial({ color: 0xff6600, roughness: 0.5, metalness: 0.8, side: DoubleSide }),
  ];

  const teslaCoil = new Mesh(new TeslaCoilGeometry(), materials);
  scene.add(teslaCoil);
  centerObject(teslaCoil);

  return () => {
    teslaCoil.geometry.dispose();
    materials.forEach((m) => m.dispose());
    dispose();
  };
}