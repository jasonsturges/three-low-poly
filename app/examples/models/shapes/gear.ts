import GUI from "lil-gui";
import { Gear, GearGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Gear" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    teeth: 5,
    rotation: 0,
    innerRadius: 0.5,
    outerRadius: 1.0,
    holeSides: 5,
    holeRadius: 0.25,
    depth: 0.25,
  };

  const gear = new Gear(params);
  scene.add(gear);

  const rebuild = () => {
    gear.geometry.dispose();
    gear.geometry = new GearGeometry(params);

    // The gear clamps the bore to fit inside its teeth, and the limit tightens as teeth
    // get sparse. Show the radius it actually used rather than the one we asked for.
    if (params.holeRadius > gear.geometry.holeRadius) {
      params.holeRadius = gear.geometry.holeRadius;
      holeRadiusControl.updateDisplay();
    }
  };

  const gui = new GUI();
  gui.title("Gear");
  gui.add(params, "teeth", 2, 32, 1).name("Teeth").onChange(rebuild);
  gui.add(params, "rotation", -Math.PI, Math.PI, 0.01).name("Rotation").onChange(rebuild);
  gui.add(params, "innerRadius", 0.1, 5.0, 0.1).name("Inner Radius").onChange(rebuild);
  gui.add(params, "outerRadius", 0.1, 5.0, 0.1).name("Outer Radius").onChange(rebuild);
  gui.add(params, "holeSides", 3, 32, 1).name("Hole Sides").onChange(rebuild);

  const holeRadiusControl = gui.add(params, "holeRadius", 0, 5.0, 0.01).name("Hole Radius").onChange(rebuild);

  gui.add(params, "depth", 0, 5.0, 0.1).name("Depth").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    gear.geometry.dispose();
    dispose();
  };
}
