import {
  DirectionalLight,
  HemisphereLight,
  Material,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";
import GUI from "lil-gui";
import { CathedralWindow } from "three-low-poly";
import { clearDefaultLights } from "../../../framework/clearDefaultLights";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Cathedral Window" };

const WALL_T = 0.4;

function disposeMaterial(material: Material | Material[]): void {
  if (Array.isArray(material)) material.forEach((m) => m.dispose());
  else material.dispose();
}

function disposeWindow(window: CathedralWindow): void {
  window.lattice.geometry.dispose();
  disposeMaterial(window.lattice.material);
  window.frame.geometry.dispose();
  disposeMaterial(window.frame.material);
  window.glass?.geometry.dispose();
  window.glass?.material.dispose();
  window.children.forEach((child) => {
    if (child instanceof Mesh && child !== window.frame && child !== window.glass && child !== window.lattice) {
      child.geometry.dispose();
      disposeMaterial(child.material);
    }
  });
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
    useCellsX: false,
    cell: 0.55,
    cellsX: 10,
    ringThickness: 0.05,
    ringDepth: 0.06,
    frameThickness: 0.055,
    frameDepth: WALL_T * 0.28,
    glass: true,
    latticeCell: 0,
    ringCount: 0,
  };

  const makeWindow = () => {
    const window = new CathedralWindow({
      width: params.width,
      height: params.height,
      ringThickness: params.ringThickness,
      ringDepth: params.ringDepth,
      frameThickness: params.frameThickness,
      frameDepth: params.frameDepth,
      glass: params.glass,
      ...(params.useCellsX ? { cellsX: params.cellsX } : { cell: params.cell }),
    });
    params.latticeCell = window.fittedGrid.latticeCell;
    params.ringCount = window.fittedGrid.count;
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
    latticeCellController.updateDisplay();
    ringCountController.updateDisplay();
  };

  const gui = new GUI();
  gui.title("Cathedral Window");

  const openingFolder = gui.addFolder("Opening");
  openingFolder.add(params, "width", 2, 8).name("Width").step(0.1).onChange(rebuild);
  openingFolder.add(params, "height", 2, 10).name("Height").step(0.1).onChange(rebuild);
  openingFolder.open();

  const latticeFolder = gui.addFolder("Lattice");
  latticeFolder.add(params, "useCellsX").name("Use Cells X").onChange(rebuild);
  latticeFolder.add(params, "cell", 0.25, 1.2).name("Cell").step(0.01).onChange(rebuild);
  latticeFolder.add(params, "cellsX", 4, 24).name("Cells X").step(1).onChange(rebuild);
  const latticeCellController = latticeFolder.add(params, "latticeCell").name("Lattice cell").disable();
  const ringCountController = latticeFolder.add(params, "ringCount").name("Ring count").disable();
  latticeFolder.add(params, "ringThickness", 0.02, 0.12).name("Ring Wall").step(0.005).onChange(rebuild);
  latticeFolder.add(params, "ringDepth", 0.02, 0.15).name("Ring Depth").step(0.01).onChange(rebuild);
  latticeFolder.add(params, "frameThickness", 0.02, 0.12).name("Frame Thickness").step(0.005).onChange(rebuild);
  latticeFolder.add(params, "frameDepth", 0.04, 0.2).name("Frame Depth").step(0.01).onChange(rebuild);
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