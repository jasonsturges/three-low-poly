import { DirectionalLight, HemisphereLight, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import GUI from "lil-gui";
import { GeorgianWindow } from "three-low-poly";
import { clearDefaultLights } from "../../../framework/clearDefaultLights";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Georgian Window" };

const WALL_T = 0.4;

function disposeWindow(window: GeorgianWindow): void {
  window.mullions.geometry.dispose();
  window.mullions.material.dispose();
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
    cellsX: 4,
    cellsY: 6,
    mullionThickness: 0.055,
    mullionDepth: WALL_T * 0.28,
    glass: true,
    paneWidth: 0,
    paneHeight: 0,
  };

  const makeWindow = () => {
    const window = new GeorgianWindow({
      width: params.width,
      height: params.height,
      cellsX: params.cellsX,
      cellsY: params.cellsY,
      mullionThickness: params.mullionThickness,
      mullionDepth: params.mullionDepth,
      glass: params.glass,
    });
    params.paneWidth = window.fittedGrid.paneWidth;
    params.paneHeight = window.fittedGrid.paneHeight;
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
    paneWidthController.updateDisplay();
    paneHeightController.updateDisplay();
  };

  const gui = new GUI();
  gui.title("Georgian Window");

  const openingFolder = gui.addFolder("Opening");
  openingFolder.add(params, "width", 2, 8).name("Width").step(0.1).onChange(rebuild);
  openingFolder.add(params, "height", 2, 10).name("Height").step(0.1).onChange(rebuild);
  openingFolder.open();

  const gridFolder = gui.addFolder("Pane Grid");
  gridFolder.add(params, "cellsX", 1, 16).name("Panes X (width)").step(1).onChange(rebuild);
  gridFolder.add(params, "cellsY", 1, 16).name("Panes Y (height)").step(1).onChange(rebuild);
  const paneWidthController = gridFolder.add(params, "paneWidth").name("Pane width").disable();
  const paneHeightController = gridFolder.add(params, "paneHeight").name("Pane height").disable();
  gridFolder.add(params, "mullionThickness", 0.02, 0.12).name("Mullion Thickness").step(0.005).onChange(rebuild);
  gridFolder.add(params, "mullionDepth", 0.04, 0.2).name("Mullion Depth").step(0.01).onChange(rebuild);
  gridFolder.add(params, "glass").name("Glass Pane").onChange(rebuild);

  return () => {
    gui.destroy();
    scene.remove(window);
    disposeWindow(window);
    floor.geometry.dispose();
    (floor.material as MeshStandardMaterial).dispose();
    dispose();
  };
}