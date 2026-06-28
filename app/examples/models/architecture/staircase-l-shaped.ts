import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { LShapedStaircaseGeometry } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";

export const meta = { title: "L-Shaped Staircase" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createOrthographicScene(container);

  const lShapedStaircaseGeometry = new LShapedStaircaseGeometry(2, 0.3, 0.5, 5, 2);
  const material = new MeshStandardMaterial({ color: 0x8b4513, side: DoubleSide });
  const lShapedStaircaseMesh = new Mesh(lShapedStaircaseGeometry, material);
  lShapedStaircaseMesh.rotation.y = Math.PI;
  scene.add(lShapedStaircaseMesh);

  return () => {
    lShapedStaircaseGeometry.dispose();
    material.dispose();
    dispose();
  };
}