import GUI from "lil-gui";
import { SquareHeadstone, SquareHeadstoneGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Square Headstone" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    width: 0.5,
    height: 0.8,
    depth: 0.15,
  };

  const squareHeadstone = new SquareHeadstone();
  scene.add(squareHeadstone);
  centerObject(squareHeadstone);

  const rebuild = () => {
    squareHeadstone.geometry.dispose();
    squareHeadstone.geometry = new SquareHeadstoneGeometry(params.width, params.height, params.depth);
  };

  const gui = new GUI();
  gui.add(params, "width", 0.1, 2).name("Width").step(0.1).onChange(rebuild);
  gui.add(params, "height", 0.1, 2).name("Height").step(0.1).onChange(rebuild);
  gui.add(params, "depth", 0.1, 2).name("Depth").step(0.1).onChange(rebuild);

  return () => {
    gui.destroy();
    squareHeadstone.geometry.dispose();
    dispose();
  };
}