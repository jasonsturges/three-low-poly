import GUI from "lil-gui";
import { Rock, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Rock" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    radius: 1,
    widthSegments: 4,
    heightSegments: 4,
    color: "#808080",
  };

  const makeRock = () => new Rock(params);

  let rock = makeRock();
  scene.add(rock);
  centerObject(rock);

  const rebuild = () => {
    scene.remove(rock);
    rock.geometry.dispose();
    rock.material.dispose();
    rock = makeRock();
    scene.add(rock);
    centerObject(rock);
  };

  const gui = new GUI();
  gui.title("Rock");
  gui.add(params, "radius", 0.25, 2, 0.01).name("Radius").onChange(rebuild);
  gui.add(params, "widthSegments", 2, 8, 1).name("Width Segments").onChange(rebuild);
  gui.add(params, "heightSegments", 2, 8, 1).name("Height Segments").onChange(rebuild);
  gui.addColor(params, "color").name("Color").onChange(() => rock.material.color.set(params.color));

  return () => {
    gui.destroy();
    scene.remove(rock);
    rock.geometry.dispose();
    rock.material.dispose();
    dispose();
  };
}