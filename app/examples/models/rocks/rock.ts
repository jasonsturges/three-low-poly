import GUI from "lil-gui";
import { Rock, RockGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Rock" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const parameters = {
    radius: 1,
    widthSegments: 4,
    heightSegments: 4,
  };

  const rock = new Rock(parameters.radius, parameters.widthSegments, parameters.heightSegments);
  scene.add(rock);

  const rebuild = () => {
    rock.geometry.dispose();
    rock.geometry = new RockGeometry(parameters.radius, parameters.widthSegments, parameters.heightSegments);
    scene.add(rock);
  };

  const gui = new GUI();
  gui.title("Rock");
  gui.add(parameters, "radius", 0.25, 2, 0.01).onChange(rebuild);
  gui.add(parameters, "widthSegments", 2, 8, 1).onChange(rebuild);
  gui.add(parameters, "heightSegments", 2, 8, 1).onChange(rebuild);

  return () => {
    gui.destroy();
    rock.geometry.dispose();
    dispose();
  };
}