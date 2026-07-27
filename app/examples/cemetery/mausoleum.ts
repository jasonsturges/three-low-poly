import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial, PointLight } from "three";
import { centerObject, createDoubleDoor, DoubleDoor, MausoleumGeometry } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Mausoleum",
  description:
    "A hollow shell with an arched doorway carved out of the front wall's outline — open the doors " +
    "and look inside.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [4, 3, 9] });

  // One material per geometry group, in the order the geometry declares them. The interior is darkest
  // and fully rough because nothing in there sees the sun.
  const stone = [
    new MeshStandardMaterial({ color: 0x808080, flatShading: true }), // 0 base
    new MeshStandardMaterial({ color: 0x696969, flatShading: true }), // 1 building — walls and pillars
    new MeshStandardMaterial({ color: 0x505050, flatShading: true }), // 2 roof
    new MeshStandardMaterial({ color: 0x2e2e2e, flatShading: true, roughness: 1 }), // 3 interior
  ];

  const mausoleum = new Mesh(new MausoleumGeometry(), stone);
  mausoleum.castShadow = true;
  mausoleum.receiveShadow = true;

  // Ask the building where its doorway is rather than hardcoding it. Trim the door slightly under the
  // opening on every axis, so the leaves clear the jambs instead of z-fighting against them.
  const { width, height, archHeight, x, y, z } = mausoleum.geometry.doorway;

  const doors: DoubleDoor = createDoubleDoor({
    width: width - 0.04,
    height: height - 0.02,
    archHeight: archHeight - 0.02, // still exactly half the width: a true semicircle
    thickness: 0.1,
    hingeLength: 0.4, // each leaf is only ~0.6 wide
    hingeWidth: 0.14,
    studRows: 4,
    studCols: 2,
    studRadius: 0.03,
  });
  // `z` is the facade, so the pins stand on the outside of the wall and the studs catch the light.
  doors.position.set(x, y, z);

  // Children of the mausoleum, so the whole thing places and centers as one object — and the leaves
  // still swing on their own hinges, because their origins are local.
  mausoleum.add(doors);

  // Nothing inside a mausoleum sees the sun. Without this the interior is a black void rather than a room.
  const interiorLight = new PointLight(0xffd9a0, 6, 6, 2);
  interiorLight.position.set(0, 2.4, -0.4);
  mausoleum.add(interiorLight);

  scene.add(mausoleum);
  centerObject(mausoleum);

  // Each leaf is its own door. Start them at different angles — a tomb that has been opened once and
  // never quite closed reads better than a matched pair.
  const params = { left: 1.1, right: 0.35, interior: true };

  // Outward, toward the hinges. The leaves mirror, so the sign flips between them.
  const swing = () => {
    doors.left.rotation.y = -params.left;
    doors.right.rotation.y = params.right;
  };
  swing();

  const gui = new GUI();
  gui.title("Mausoleum");

  const swingFolder = gui.addFolder("Swing");
  swingFolder.add(params, "left", -2.2, 2.2, 0.01).name("Left Leaf (− in · out +)").onChange(swing);
  swingFolder.add(params, "right", -2.2, 2.2, 0.01).name("Right Leaf (− in · out +)").onChange(swing);
  swingFolder.open();

  gui
    .add(params, "interior")
    .name("Interior Light")
    .onChange((on: boolean) => {
      interiorLight.visible = on;
    });

  return () => {
    gui.destroy();
    for (const leaf of [doors.left, doors.right]) {
      leaf.geometry.dispose();
      leaf.material.forEach((m) => m.dispose());
    }
    mausoleum.geometry.dispose();
    mausoleum.material.forEach((m) => m.dispose());
    dispose();
  };
}
