import GUI from "lil-gui";
import { CrossHeadstone, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Cross Headstone" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    width: 0.55,
    height: 1.15,
    depth: 0.14,
    crossbar: 0.68,
  };

  const makeHeadstone = () => new CrossHeadstone(params);

  let crossHeadstone = makeHeadstone();
  scene.add(crossHeadstone);
  centerObject(crossHeadstone);

  const rebuild = () => {
    scene.remove(crossHeadstone);
    crossHeadstone.geometry.dispose();
    crossHeadstone.material.dispose();
    crossHeadstone = makeHeadstone();
    scene.add(crossHeadstone);
    centerObject(crossHeadstone);
  };

  const gui = new GUI();
  gui.add(params, "width", 0.2, 1.2, 0.01).name("Arm Span").onChange(rebuild);
  gui.add(params, "height", 0.4, 2, 0.05).name("Height").onChange(rebuild);
  gui.add(params, "depth", 0.05, 0.4, 0.01).name("Depth").onChange(rebuild);
  // A Latin cross carries the bar high; 0.5 makes it a Greek cross.
  gui.add(params, "crossbar", 0.4, 0.85, 0.01).name("Crossbar Height").onChange(rebuild);

  return () => {
    gui.destroy();
    crossHeadstone.geometry.dispose();
    dispose();
  };
}