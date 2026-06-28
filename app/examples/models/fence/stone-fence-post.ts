import GUI from "lil-gui";
import { StoneFencePost, StoneFencePostGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Stone Fence Post" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    height: 2.25,
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
  gui.add(params, "height", 0.1, 5).name("Height").step(0.1).onChange(rebuild);

  return () => {
    gui.destroy();
    fencePost.geometry.dispose();
    dispose();
  };
}