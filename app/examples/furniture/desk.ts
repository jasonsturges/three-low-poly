import { Mesh, MeshStandardMaterial } from "three";
import { DeskGeometry } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Desk" };

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, { cameraPosition: [0, 5, 5] });
  controls.target.set(0, 2, 0);

  // Group 0 is the surface, group 1 the legs.
  const materials = [
    new MeshStandardMaterial({ color: 0x8b5a2b }),
    new MeshStandardMaterial({ color: 0x4b3621 }),
  ];

  const desk = new Mesh(new DeskGeometry(), materials);
  scene.add(desk);

  return () => {
    desk.geometry.dispose();
    materials.forEach((m) => m.dispose());
    dispose();
  };
}