import { Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import GUI from "lil-gui";
import { checkerboardTexture } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Checkerboard" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  let size = 8;

  const texture = checkerboardTexture(size);
  const material = new MeshStandardMaterial({ map: texture });
  const geometry = new PlaneGeometry(10, 10);
  const plane = new Mesh(geometry, material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1;
  scene.add(plane);

  const gui = new GUI();
  gui
    .add({ size: 8 }, "size", 2, 32, 1)
    .name("Grid Size")
    .onChange((value: number) => {
      size = value;
      material.map?.dispose();
      material.map = checkerboardTexture(size);
      material.needsUpdate = true;
    });

  return () => {
    gui.destroy();
    geometry.dispose();
    material.map?.dispose();
    material.dispose();
    dispose();
  };
}