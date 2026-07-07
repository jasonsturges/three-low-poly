import GUI from "lil-gui";
import { Star, StarGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Star" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    points: 5,
    innerRadius: 0.5,
    outerRadius: 1.0,
    depth: 0.25,
  };

  const star = new Star();
  scene.add(star);

  const rebuild = () => {
    star.geometry.dispose();
    star.geometry = new StarGeometry(params);
    centerObject(star);
  };

  const gui = new GUI();
  gui.title("Star");
  gui.add(params, "points", 2, 32, 1).name("Points").onChange(rebuild);
  gui.add(params, "innerRadius", 0.1, 5.0, 0.1).name("Inner Radius").onChange(rebuild);
  gui.add(params, "outerRadius", 0.1, 5.0, 0.1).name("Outer Radius").onChange(rebuild);
  gui.add(params, "depth", 0, 5.0, 0.1).name("Depth").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    star.geometry.dispose();
    dispose();
  };
}