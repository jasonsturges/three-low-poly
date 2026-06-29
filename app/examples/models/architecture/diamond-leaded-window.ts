import { DirectionalLight, HemisphereLight, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import GUI from "lil-gui";
import { DiamondLeadedWindow } from "three-low-poly";
import { clearDefaultLights } from "../../../framework/clearDefaultLights";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Diamond Leaded Window" };

const WALL_T = 0.4;

function disposeWindow(window: DiamondLeadedWindow): void {
  window.lattice.geometry.dispose();
  window.lattice.material.dispose();
  window.glass?.geometry.dispose();
  window.glass?.material.dispose();
}

export default function (container: HTMLElement) {
  const { scene, controls, renderer, dispose } = createScene(container, {
    background: 0x0a0a12,
    cameraPosition: [0, 0, 9],
  });
  clearDefaultLights(scene);
  controls.target.set(0, 0, 0);
  controls.update();

  renderer.shadowMap.enabled = true;

  scene.add(new HemisphereLight(0x8899bb, 0x1a1a22, 0.4));

  const exteriorLight = new DirectionalLight(0xffffff, 1.1);
  exteriorLight.position.set(4, 6, 8);
  exteriorLight.castShadow = true;
  exteriorLight.shadow.mapSize.set(2048, 2048);
  exteriorLight.shadow.camera.near = 0.5;
  exteriorLight.shadow.camera.far = 30;
  exteriorLight.shadow.camera.left = -8;
  exteriorLight.shadow.camera.right = 8;
  exteriorLight.shadow.camera.top = 8;
  exteriorLight.shadow.camera.bottom = -8;
  exteriorLight.shadow.bias = -0.0002;
  scene.add(exteriorLight);

  const interiorLight = new DirectionalLight(0xffeedd, 0.35);
  interiorLight.position.set(-1, 3, -7);
  scene.add(interiorLight);

  const floor = new Mesh(
    new PlaneGeometry(14, 14),
    new MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.5;
  floor.receiveShadow = true;
  scene.add(floor);

  const params = {
    width: 4.5,
    height: 5.5,
    cellsX: 10,
    cellsY: 10,
    leadThickness: 0.055,
    leadDepth: WALL_T * 0.28,
    glass: true,
    halfDiagonalA: 0,
    halfDiagonalB: 0,
    cameAngleDeg: 0,
  };

  const makeWindow = () => {
    const window = new DiamondLeadedWindow({
      width: params.width,
      height: params.height,
      cellsX: params.cellsX,
      cellsY: params.cellsY,
      leadThickness: params.leadThickness,
      leadDepth: params.leadDepth,
      glass: params.glass,
    });
    params.halfDiagonalA = window.fittedGrid.a;
    params.halfDiagonalB = window.fittedGrid.b;
    params.cameAngleDeg = (window.fittedGrid.angle * 180) / Math.PI;
    window.castShadow = true;
    return window;
  };

  let window = makeWindow();
  scene.add(window);

  const rebuild = () => {
    scene.remove(window);
    disposeWindow(window);
    window = makeWindow();
    scene.add(window);
    halfAController.updateDisplay();
    halfBController.updateDisplay();
    angleController.updateDisplay();
  };

  const gui = new GUI();
  gui.title("Diamond Leaded Window");

  const openingFolder = gui.addFolder("Opening");
  openingFolder.add(params, "width", 2, 8).name("Width").step(0.1).onChange(rebuild);
  openingFolder.add(params, "height", 2, 10).name("Height").step(0.1).onChange(rebuild);
  openingFolder.open();

  const latticeFolder = gui.addFolder("Lattice Grid");
  latticeFolder.add(params, "cellsX", 1, 24).name("Cells X (width)").step(1).onChange(rebuild);
  latticeFolder.add(params, "cellsY", 1, 24).name("Cells Y (height)").step(1).onChange(rebuild);
  const halfAController = latticeFolder.add(params, "halfDiagonalA").name("Half-diag A (E–W)").disable();
  const halfBController = latticeFolder.add(params, "halfDiagonalB").name("Half-diag B (N–S)").disable();
  const angleController = latticeFolder.add(params, "cameAngleDeg").name("Came angle °").disable();
  latticeFolder.add(params, "leadThickness", 0.02, 0.12).name("Lead Thickness").step(0.005).onChange(rebuild);
  latticeFolder.add(params, "leadDepth", 0.04, 0.2).name("Lead Depth").step(0.01).onChange(rebuild);
  latticeFolder.add(params, "glass").name("Glass Pane").onChange(rebuild);

  return () => {
    gui.destroy();
    scene.remove(window);
    disposeWindow(window);
    floor.geometry.dispose();
    (floor.material as MeshStandardMaterial).dispose();
    dispose();
  };
}