import GUI from "lil-gui";
import { CrossHeadstone, CrossHeadstoneGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Cross Headstone" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    width: 0.4,
    height: 1.2,
    depth: 0.2,
  };

  const crossHeadstone = new CrossHeadstone();
  scene.add(crossHeadstone);
  centerObject(crossHeadstone);

  const rebuild = () => {
    crossHeadstone.geometry.dispose();
    crossHeadstone.geometry = new CrossHeadstoneGeometry(params.width, params.height, params.depth);
  };

  const gui = new GUI();
  gui.add(params, "width", 0.1, 2).name("Width").step(0.1).onChange(rebuild);
  gui.add(params, "height", 0.1, 2).name("Height").step(0.1).onChange(rebuild);
  gui.add(params, "depth", 0.1, 2).name("Depth").step(0.1).onChange(rebuild);

  return () => {
    gui.destroy();
    crossHeadstone.geometry.dispose();
    dispose();
  };
}