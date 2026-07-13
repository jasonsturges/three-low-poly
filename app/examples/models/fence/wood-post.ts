import GUI from "lil-gui";
import { centerObject, WoodPost, WoodPostGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wood Post" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x6ea8d8 });

  const params = {
    width: 0.12,
    height: 1.5,
    capWidth: 0.18,
    capHeight: 0.05,
  };

  const post = new WoodPost(params);
  scene.add(post);
  centerObject(post);

  const rebuild = () => {
    post.geometry.dispose();
    post.geometry = new WoodPostGeometry(params);
    centerObject(post);
  };

  const gui = new GUI();
  gui.add(params, "width", 0.04, 0.5, 0.01).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.3, 3, 0.05).name("Height").onChange(rebuild);
  gui.add(params, "capWidth", 0.04, 0.6, 0.01).name("Cap Width").onChange(rebuild);
  gui.add(params, "capHeight", 0, 0.3, 0.01).name("Cap Height").onChange(rebuild);

  return () => {
    gui.destroy();
    post.geometry.dispose();
    post.material.dispose();
    dispose();
  };
}
