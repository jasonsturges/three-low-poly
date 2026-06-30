import GUI from "lil-gui";
import { Leaf } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Leaf" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 0, 0.35] });

  const params = {
    size: 0.13,
    lift: 0.22,
    color: "#a8702c",
  };

  const makeLeaf = () =>
    new Leaf({
      size: params.size,
      lift: params.lift,
      color: params.color,
    });

  let leaf = makeLeaf();
  scene.add(leaf);

  const rebuild = () => {
    scene.remove(leaf);
    leaf.geometry.dispose();
    leaf.material.dispose();
    leaf = makeLeaf();
    scene.add(leaf);
  };

  const gui = new GUI();
  gui.title("Leaf");
  gui.add(params, "size", 0.05, 0.4).name("Size").step(0.01).onChange(rebuild);
  gui.add(params, "lift", 0, 0.5).name("Lift").step(0.01).onChange(rebuild);
  gui.addColor(params, "color")
    .name("Color")
    .onChange(() => {
      leaf.material.color.set(params.color);
    });

  return () => {
    gui.destroy();
    scene.remove(leaf);
    leaf.geometry.dispose();
    leaf.material.dispose();
    dispose();
  };
}