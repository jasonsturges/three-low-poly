import GUI from "lil-gui";
import { Heart, HeartGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Heart" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    size: 1,
    width: 2.1,
    height: 1.4,
    tipDepth: 1.6,
    depth: 0.25,
    wireframe: false,
  };

  const heart = new Heart(params);
  scene.add(heart);

  const rebuild = () => {
    heart.geometry.dispose();
    heart.geometry = new HeartGeometry(params);
    centerObject(heart);
  };

  const gui = new GUI();
  gui.title("Heart");
  gui.add(params, "size", 1, 5, 0.1).name("Size").onChange(rebuild);
  gui.add(params, "width", 0.1, 5.0, 0.1).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.1, 5.0, 0.1).name("height").onChange(rebuild);
  gui.add(params, "tipDepth", 0.1, 5.0, 0.1).name("Tip Depth").onChange(rebuild);
  gui.add(params, "depth", 0, 5.0, 0.1).name("Depth").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    heart.geometry.dispose();
    dispose();
  };
}