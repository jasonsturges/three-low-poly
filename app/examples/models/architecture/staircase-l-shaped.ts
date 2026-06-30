import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";
import { LShapedStaircase } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";

export const meta = { title: "L-Shaped Staircase" };

function frameStaircase(staircase: LShapedStaircase, controls: OrbitControls) {
  const run = staircase.flightRun;
  controls.target.set(run / 2, staircase.totalHeight / 2, -run / 2);
  controls.update();
}

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createOrthographicScene(container);

  const params = {
    width: 2,
    riserHeight: 0.3,
    treadDepth: 0.5,
    stepsPerFlight: 5,
    landingSize: 2,
    flightRun: 2.5,
    totalHeight: 3,
    color: "#8b4513",
  };

  const syncDerived = (staircase: LShapedStaircase) => {
    params.landingSize = staircase.landingSize;
    params.flightRun = staircase.flightRun;
    params.totalHeight = staircase.totalHeight;
  };

  const makeStaircase = () => {
    const staircase = new LShapedStaircase({
      width: params.width,
      riserHeight: params.riserHeight,
      treadDepth: params.treadDepth,
      stepsPerFlight: params.stepsPerFlight,
      color: params.color,
    });
    staircase.rotation.y = Math.PI;
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
    landingSizeController.updateDisplay();
    flightRunController.updateDisplay();
    totalHeightController.updateDisplay();
  };

  const gui = new GUI();
  gui.title("L-Shaped Staircase");

  const stepFolder = gui.addFolder("Steps");
  stepFolder.add(params, "width", 0.5, 6).name("Width").step(0.1).onChange(rebuild);
  stepFolder.add(params, "riserHeight", 0.05, 0.6).name("Riser Height").step(0.01).onChange(rebuild);
  stepFolder.add(params, "treadDepth", 0.1, 1.5).name("Tread Depth").step(0.05).onChange(rebuild);
  stepFolder.add(params, "stepsPerFlight", 1, 16).name("Steps / Flight").step(1).onChange(rebuild);
  stepFolder.open();

  const derivedFolder = gui.addFolder("Derived");
  const landingSizeController = derivedFolder.add(params, "landingSize").name("Landing (width²)").disable();
  const flightRunController = derivedFolder.add(params, "flightRun").name("Flight Run").disable();
  const totalHeightController = derivedFolder.add(params, "totalHeight").name("Total Height").disable();

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