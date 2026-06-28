import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { StaircaseGeometry } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";

export const meta = { title: "Staircase" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createOrthographicScene(container);

  const staircaseGeometry = new StaircaseGeometry(2, 0.3, 0.5, 10);
  const material = new MeshStandardMaterial({ color: 0x8b4513, side: DoubleSide });
  const staircaseMesh = new Mesh(staircaseGeometry, material);
  staircaseMesh.rotation.y = Math.PI;
  scene.add(staircaseMesh);

  return () => {
    staircaseGeometry.dispose();
    material.dispose();
    dispose();
  };
}