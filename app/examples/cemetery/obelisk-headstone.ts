import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial } from "three";
import { ObeliskHeadstoneGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Obelisk Headstone" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    totalHeight: 1.75,
    baseWidth: 0.75,
  };

  const stone = new MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });

  const makeHeadstone = () => new Mesh(new ObeliskHeadstoneGeometry(params), stone);

  let obeliskHeadstone = makeHeadstone();
  scene.add(obeliskHeadstone);
  centerObject(obeliskHeadstone);

  const rebuild = () => {
    scene.remove(obeliskHeadstone);
    obeliskHeadstone.geometry.dispose();
    obeliskHeadstone = makeHeadstone();
    scene.add(obeliskHeadstone);
    centerObject(obeliskHeadstone);
  };

  const gui = new GUI();
  gui.add(params, "totalHeight", 0.1, 4).name("Total Height").step(0.1).onChange(rebuild);
  gui.add(params, "baseWidth", 0.1, 2).name("Base Width").step(0.1).onChange(rebuild);

  return () => {
    gui.destroy();
    obeliskHeadstone.geometry.dispose();
    stone.dispose();
    dispose();
  };
}