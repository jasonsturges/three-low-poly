import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { BifurcatedStaircaseGeometry } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";

export const meta = { title: "Bifurcated Staircase" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createOrthographicScene(container);

  const bifurcatedStaircaseGeometry = new BifurcatedStaircaseGeometry(2, 0.3, 0.5, 5, 5, Math.PI / 4);
  const material = new MeshStandardMaterial({ color: 0x8b4513, side: DoubleSide });
  const bifurcatedStaircaseMesh = new Mesh(bifurcatedStaircaseGeometry, material);
  bifurcatedStaircaseMesh.rotation.y = Math.PI;
  scene.add(bifurcatedStaircaseMesh);

  return () => {
    bifurcatedStaircaseGeometry.dispose();
    material.dispose();
    dispose();
  };
}