import GUI from "lil-gui";
import { Hexagon, HexagonGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Hexagon" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    radius: 1,
    depth: 0.01,
  };

  const hexagon = new Hexagon(params);
  scene.add(hexagon);

  const rebuild = () => {
    hexagon.geometry.dispose();
    hexagon.geometry = new HexagonGeometry(params);
    centerObject(hexagon);
  };

  const gui = new GUI();
  gui.title("Hexagon");
  gui.add(params, "radius", 0.1, 2, 0.01).name("Radius").onChange(rebuild);
  gui.add(params, "depth", 0, 1, 0.01).name("Depth").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    hexagon.geometry.dispose();
    dispose();
  };
}