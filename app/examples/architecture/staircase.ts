import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";
import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { StaircaseGeometry } from "three-low-poly";
import { createOrthographicScene } from "../../framework/createOrthographicScene";

export const meta = { title: "Staircase" };

function frameStaircase(geometry: StaircaseGeometry, controls: OrbitControls) {
  // Geometry runs +Z; the example rotates π so the run extends toward −Z.
  controls.target.set(0, geometry.totalHeight / 2, -geometry.totalDepth / 2);
  controls.update();
}

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createOrthographicScene(container);

  const params = {
    width: 2,
    riserHeight: 0.3,
    treadDepth: 0.5,
    stepCount: 10,
    totalHeight: 3,
    totalDepth: 5,
    color: "#8b4513",
  };

  const syncDerived = (geometry: StaircaseGeometry) => {
    params.totalHeight = geometry.totalHeight;
    params.totalDepth = geometry.totalDepth;
  };

  // Open shell (no side stringers yet), so DoubleSide keeps the undersides visible.
  const wood = new MeshStandardMaterial({
    color: params.color,
    roughness: 0.85,
    metalness: 0.04,
    side: DoubleSide,
  });

  const makeStaircase = () => {
    const staircase = new Mesh(
      new StaircaseGeometry({
        width: params.width,
        riserHeight: params.riserHeight,
        treadDepth: params.treadDepth,
        stepCount: params.stepCount,
      }),
      wood,
    );
    staircase.rotation.y = Math.PI;
    return staircase;
  };

  let staircase = makeStaircase();
  syncDerived(staircase.geometry);
  scene.add(staircase);
  frameStaircase(staircase.geometry, controls);

  const rebuild = () => {
    scene.remove(staircase);
    staircase.geometry.dispose();
    staircase = makeStaircase();
    syncDerived(staircase.geometry);
    scene.add(staircase);
    frameStaircase(staircase.geometry, controls);
    totalHeightController.updateDisplay();
    totalDepthController.updateDisplay();
  };

  const gui = new GUI();
  gui.title("Staircase");

  const stepFolder = gui.addFolder("Steps");
  stepFolder.add(params, "width", 0.5, 6).name("Width").step(0.1).onChange(rebuild);
  stepFolder.add(params, "riserHeight", 0.05, 0.6).name("Riser Height").step(0.01).onChange(rebuild);
  stepFolder.add(params, "treadDepth", 0.1, 1.5).name("Tread Depth").step(0.05).onChange(rebuild);
  stepFolder.add(params, "stepCount", 1, 24).name("Step Count").step(1).onChange(rebuild);
  stepFolder.open();

  const derivedFolder = gui.addFolder("Derived");
  const totalHeightController = derivedFolder.add(params, "totalHeight").name("Total Height").disable();
  const totalDepthController = derivedFolder.add(params, "totalDepth").name("Total Depth").disable();

  gui.addColor(params, "color")
    .name("Color")
    .onChange(() => {
      wood.color.set(params.color);
    });

  return () => {
    gui.destroy();
    scene.remove(staircase);
    staircase.geometry.dispose();
    wood.dispose();
    dispose();
  };
}