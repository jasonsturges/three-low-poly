import GUI from "lil-gui";
import { centerObject, StoneFencePost, StoneFencePostGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Stone Fence Post" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    height: 2.25,
    columnWidth: 1,
    baseWidth: 1.2,
    baseHeight: 0.5,
    capWidth: 1.4,
    capHeight: 0.3,
  };

  const fencePost = new StoneFencePost(params);
  scene.add(fencePost);
  centerObject(fencePost);

  const rebuild = () => {
    fencePost.geometry.dispose();
    fencePost.geometry = new StoneFencePostGeometry(params);
    centerObject(fencePost);
  };

  const gui = new GUI();
  gui.add(params, "height", 0.1, 5, 0.05).name("Column Height").onChange(rebuild);
  gui.add(params, "columnWidth", 0.2, 2, 0.05).name("Column Width").onChange(rebuild);
  gui.add(params, "baseWidth", 0.2, 2.5, 0.05).name("Base Width").onChange(rebuild);
  gui.add(params, "baseHeight", 0, 1.5, 0.05).name("Base Height").onChange(rebuild);
  gui.add(params, "capWidth", 0.2, 2.5, 0.05).name("Cap Width").onChange(rebuild);
  gui.add(params, "capHeight", 0, 1, 0.05).name("Cap Height").onChange(rebuild);

  return () => {
    gui.destroy();
    fencePost.geometry.dispose();
    fencePost.material.dispose();
    dispose();
  };
}
