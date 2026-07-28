import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial } from "three";
import { MossyRockGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Mossy Rock" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    radius: 1,
    detail: 0,
    mossScaleXZ: 0.9,
    mossScaleY: 0.5,
    mossOffsetY: 0.3,
    rockColor: "#808080",
    mossColor: "#4b8b3b",
    mossOpacity: 0.8,
  };

  // Group 0 is the stone, group 1 the moss shell. Built once — the colour controls mutate them.
  const materials = [
    new MeshStandardMaterial({ color: params.rockColor, flatShading: true }),
    new MeshStandardMaterial({
      color: params.mossColor,
      flatShading: true,
      opacity: params.mossOpacity,
      transparent: params.mossOpacity < 1,
    }),
  ];

  const makeRock = () => new Mesh(new MossyRockGeometry(params), materials);

  let rock = makeRock();
  scene.add(rock);
  centerObject(rock);

  const rebuild = () => {
    scene.remove(rock);
    rock.geometry.dispose();
    rock = makeRock();
    scene.add(rock);
    centerObject(rock);
  };

  const gui = new GUI();
  gui.title("Mossy Rock");

  const shapeFolder = gui.addFolder("Shape");
  shapeFolder.add(params, "radius", 0.25, 2, 0.05).name("Radius").onChange(rebuild);
  shapeFolder.add(params, "detail", 0, 2, 1).name("Detail").onChange(rebuild);
  shapeFolder.add(params, "mossScaleXZ", 0.5, 1.2, 0.01).name("Moss Scale XZ").onChange(rebuild);
  shapeFolder.add(params, "mossScaleY", 0.1, 1, 0.01).name("Moss Scale Y").onChange(rebuild);
  shapeFolder.add(params, "mossOffsetY", 0, 1, 0.01).name("Moss Offset Y").onChange(rebuild);
  shapeFolder.open();

  const materialsFolder = gui.addFolder("Materials");
  materialsFolder.addColor(params, "rockColor")
    .name("Rock")
    .onChange(() => materials[0]!.color.set(params.rockColor));
  materialsFolder.addColor(params, "mossColor")
    .name("Moss")
    .onChange(() => materials[1]!.color.set(params.mossColor));
  materialsFolder.add(params, "mossOpacity", 0.2, 1, 0.01)
    .name("Moss Opacity")
    .onChange(() => {
      materials[1]!.opacity = params.mossOpacity;
      materials[1]!.transparent = params.mossOpacity < 1;
      materials[1]!.needsUpdate = true;
    });
  materialsFolder.open();

  return () => {
    gui.destroy();
    scene.remove(rock);
    rock.geometry.dispose();
    materials.forEach((m) => m.dispose());
    dispose();
  };
}
