import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { SpiralStaircaseGeometry } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";

export const meta = { title: "Spiral Staircase" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createOrthographicScene(container);

  const spiralStaircaseGeometry = new SpiralStaircaseGeometry(2, 0.8, 0.2, 20, 1, Math.PI / 8);
  const material = new MeshStandardMaterial({ color: 0x8b4513, side: DoubleSide });
  const spiralStaircaseMesh = new Mesh(spiralStaircaseGeometry, material);
  scene.add(spiralStaircaseMesh);

  return () => {
    spiralStaircaseGeometry.dispose();
    material.dispose();
    dispose();
  };
}