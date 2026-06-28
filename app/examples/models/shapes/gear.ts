import GUI from "lil-gui";
import { Gear, GearGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Gear" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    sides: 5,
    innerRadius: 0.5,
    outerRadius: 1.0,
    holeSides: 5,
    holeRadius: 0.25,
    depth: 0.25,
    wireframe: false,
  };

  const gear = new Gear(params);
  scene.add(gear);

  const rebuild = () => {
    gear.geometry.dispose();
    gear.geometry = new GearGeometry(
      params.sides,
      params.innerRadius,
      params.outerRadius,
      params.holeSides,
      params.holeRadius,
      params.depth,
    );
    centerObject(gear);
  };

  const gui = new GUI();
  gui.title("Gear");
  gui.add(params, "sides", 2, 32, 1).name("Sides").onChange(rebuild);
  gui.add(params, "innerRadius", 0.1, 5.0, 0.1).name("Inner Radius").onChange(rebuild);
  gui.add(params, "outerRadius", 0.1, 5.0, 0.1).name("Outer Radius").onChange(rebuild);
  gui.add(params, "holeSides", 3, 32, 1).name("Hole Sides").onChange(rebuild);
  gui.add(params, "holeRadius", 0.1, 5.0, 0.1).name("Hole Radius").onChange(rebuild);
  gui.add(params, "depth", 0, 5.0, 0.1).name("Depth").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    gear.geometry.dispose();
    dispose();
  };
}