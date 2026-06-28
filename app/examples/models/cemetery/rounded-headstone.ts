import GUI from "lil-gui";
import { RoundedHeadstone, RoundedHeadstoneGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Rounded Headstone" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    width: 0.6,
    radius: 0.6,
    height: 1.0,
    depth: 0.2,
  };

  const roundedHeadstone = new RoundedHeadstone();
  scene.add(roundedHeadstone);
  centerObject(roundedHeadstone);

  const rebuild = () => {
    roundedHeadstone.geometry.dispose();
    roundedHeadstone.geometry = new RoundedHeadstoneGeometry(
      params.width,
      params.height,
      params.depth,
      params.radius,
    );
  };

  const gui = new GUI();
  gui.add(params, "width", 0.1, 2).name("Width").step(0.1).onChange(rebuild);
  gui.add(params, "radius", 0.1, 2).name("Radius").step(0.1).onChange(rebuild);
  gui.add(params, "height", 0.1, 2).name("Height").step(0.1).onChange(rebuild);
  gui.add(params, "depth", 0.1, 2).name("Depth").step(0.1).onChange(rebuild);

  return () => {
    gui.destroy();
    roundedHeadstone.geometry.dispose();
    dispose();
  };
}