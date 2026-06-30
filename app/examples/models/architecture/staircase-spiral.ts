import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";
import { SpiralStaircase } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";

export const meta = { title: "Spiral Staircase" };

function frameStaircase(staircase: SpiralStaircase, controls: OrbitControls) {
  controls.target.set(0, staircase.totalHeight / 2, 0);
  controls.update();
}

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createOrthographicScene(container);

  const params = {
    innerRadius: 0.45,
    width: 1.95,
    treadDepth: 0.45,
    riserHeight: 0.2,
    stepCount: 20,
    outerRadius: 2.4,
    stepAngleDeg: 0,
    totalHeight: 4,
    totalTurnDeg: 0,
    color: "#8b4513",
  };

  const syncDerived = (staircase: SpiralStaircase) => {
    params.outerRadius = staircase.outerRadius;
    params.stepAngleDeg = (staircase.stepAngle * 180) / Math.PI;
    params.totalHeight = staircase.totalHeight;
    params.totalTurnDeg = (staircase.totalTurn * 180) / Math.PI;
  };

  const makeStaircase = () => {
    const staircase = new SpiralStaircase({
      innerRadius: params.innerRadius,
      width: params.width,
      treadDepth: params.treadDepth,
      riserHeight: params.riserHeight,
      stepCount: params.stepCount,
      color: params.color,
    });
    return staircase;
  };

  let staircase = makeStaircase();
  syncDerived(staircase);
  scene.add(staircase);
  frameStaircase(staircase, controls);

  const rebuild = () => {
    scene.remove(staircase);
    staircase.geometry.dispose();
    staircase.material.dispose();
    staircase = makeStaircase();
    syncDerived(staircase);
    scene.add(staircase);
    frameStaircase(staircase, controls);
    outerRadiusController.updateDisplay();
    stepAngleController.updateDisplay();
    totalHeightController.updateDisplay();
    totalTurnController.updateDisplay();
  };

  const gui = new GUI();
  gui.title("Spiral Staircase");

  const coreFolder = gui.addFolder("Core");
  coreFolder.add(params, "innerRadius", 0.05, 1.5).name("Inner Radius").step(0.05).onChange(rebuild);
  coreFolder.add(params, "width", 0.2, 3).name("Tread Width").step(0.05).onChange(rebuild);
  coreFolder.add(params, "treadDepth", 0.1, 1.5).name("Tread Depth").step(0.05).onChange(rebuild);
  coreFolder.add(params, "riserHeight", 0.05, 0.6).name("Riser Height").step(0.01).onChange(rebuild);
  coreFolder.add(params, "stepCount", 1, 48).name("Step Count").step(1).onChange(rebuild);
  coreFolder.open();

  const derivedFolder = gui.addFolder("Derived");
  const outerRadiusController = derivedFolder.add(params, "outerRadius").name("Outer Radius").disable();
  const stepAngleController = derivedFolder.add(params, "stepAngleDeg").name("Step Angle (°)").disable();
  const totalHeightController = derivedFolder.add(params, "totalHeight").name("Total Height").disable();
  const totalTurnController = derivedFolder.add(params, "totalTurnDeg").name("Total Turn (°)").disable();

  gui.addColor(params, "color")
    .name("Color")
    .onChange(() => {
      staircase.material.color.set(params.color);
    });

  return () => {
    gui.destroy();
    scene.remove(staircase);
    staircase.geometry.dispose();
    staircase.material.dispose();
    dispose();
  };
}