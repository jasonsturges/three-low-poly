import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { EllipticLeafGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Elliptic Leaf" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 0, 1] });

  const geometry = new EllipticLeafGeometry();
  const material = new MeshStandardMaterial({
    color: 0x88aa33,
    flatShading: true,
    metalness: 0.1,
    roughness: 0.8,
    side: DoubleSide,
  });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  return () => {
    geometry.dispose();
    material.dispose();
    dispose();
  };
}