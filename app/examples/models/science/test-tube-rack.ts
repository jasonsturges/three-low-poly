import GUI from "lil-gui";
import { TestTubeRack } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Test Tube Rack" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const parameters = {
    count: 3,
  };

  let rack = new TestTubeRack(parameters.count);
  scene.add(rack);

  const rebuild = () => {
    scene.remove(rack);
    rack.traverse((child) => {
      if ("geometry" in child && child.geometry) {
        (child.geometry as { dispose: () => void }).dispose();
      }
      if ("material" in child && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((m: { dispose: () => void }) => m.dispose());
      }
    });
    rack = new TestTubeRack(parameters.count);
    scene.add(rack);
  };

  const gui = new GUI();
  const geometryFolder = gui.addFolder("Geometry");
  geometryFolder.add(parameters, "count", 0, 5).step(1).onChange(rebuild);
  geometryFolder.open();

  return () => {
    gui.destroy();
    rack.traverse((child) => {
      if ("geometry" in child && child.geometry) {
        (child.geometry as { dispose: () => void }).dispose();
      }
      if ("material" in child && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((m: { dispose: () => void }) => m.dispose());
      }
    });
    dispose();
  };
}