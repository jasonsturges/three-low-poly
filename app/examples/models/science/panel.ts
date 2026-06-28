import GUI from "lil-gui";
import { Panel, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Panel" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    width: 3,
    height: 4,
    depth: 0.1,
  };

  let panel = new Panel(params);
  scene.add(panel);
  centerObject(panel);

  const rebuild = () => {
    scene.remove(panel);
    panel.geometry.dispose();
    panel.material.dispose();
    panel = new Panel(params);
    scene.add(panel);
    centerObject(panel);
  };

  const gui = new GUI();
  gui.add(params, "width", 0, 5, 0.001).name("Width").onChange(rebuild);
  gui.add(params, "height", 0, 5, 0.001).name("Height").onChange(rebuild);
  gui.add(params, "depth", 0, 2, 0.001).name("Depth").onChange(rebuild);

  return () => {
    gui.destroy();
    panel.geometry.dispose();
    panel.material.dispose();
    dispose();
  };
}