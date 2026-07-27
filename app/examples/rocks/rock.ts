import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial } from "three";
import { RockGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Rock" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    radius: 1,
    widthSegments: 4,
    heightSegments: 4,
    color: "#808080",
  };

  const stone = new MeshStandardMaterial({ color: params.color, flatShading: true });

  const makeRock = () => new Mesh(new RockGeometry(params), stone);

  let rock = makeRock();
  scene.add(rock);
  centerObject(rock);

  const rebuild = () => {
    scene.remove(rock);
    rock.geometry.dispose();
    rock = makeRock();
    scene.add(rock);
    centerObject(rock);
  };

  const gui = new GUI();
  gui.title("Rock");
  gui.add(params, "radius", 0.25, 2, 0.01).name("Radius").onChange(rebuild);
  gui.add(params, "widthSegments", 2, 8, 1).name("Width Segments").onChange(rebuild);
  gui.add(params, "heightSegments", 2, 8, 1).name("Height Segments").onChange(rebuild);
  gui.addColor(params, "color").name("Color").onChange(() => stone.color.set(params.color));

  return () => {
    gui.destroy();
    scene.remove(rock);
    rock.geometry.dispose();
    stone.dispose();
    dispose();
  };
}