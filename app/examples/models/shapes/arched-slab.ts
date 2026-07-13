import GUI from "lil-gui";
import { ArchedSlab, ArchedSlabGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Arched Slab" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x6e7a86 });

  const params = {
    width: 1.2,
    height: 1.4,
    archWidth: 1.2,
    archHeight: 0.6,
    depth: 0.18,
    curveSegments: 16,
  };

  const slab = new ArchedSlab(params);
  scene.add(slab);

  const rebuild = () => {
    slab.geometry.dispose();
    slab.geometry = new ArchedSlabGeometry(params);
    centerObject(slab);
  };

  const preset = (o: Partial<typeof params>) => () => {
    Object.assign(params, o);
    rebuild();
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  };

  const presets = {
    door: preset({ width: 1.2, height: 1.4, archWidth: 1.2, archHeight: 0.6 }),
    window: preset({ width: 0.8, height: 1.0, archWidth: 0.8, archHeight: 0.4 }),
    headstone: preset({ width: 1.2, height: 1.1, archWidth: 0.7, archHeight: 0.42 }),
    pointed: preset({ width: 1.0, height: 1.3, archWidth: 1.0, archHeight: 1.0 }),
  };

  const gui = new GUI();
  gui.title("Arched Slab");

  // One outline. Only the arch's span and rise change.
  const p = gui.addFolder("Presets");
  p.add(presets, "door").name("Door");
  p.add(presets, "window").name("Window");
  p.add(presets, "headstone").name("Headstone");
  p.add(presets, "pointed").name("Pointed");
  p.open();

  gui.add(params, "width", 0.3, 2, 0.05).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.2, 2.5, 0.05).name("Body Height").onChange(rebuild);
  // Pull this BELOW the width and shoulders appear. That is the headstone.
  gui.add(params, "archWidth", 0.1, 2, 0.05).name("Arch Span").onChange(rebuild);
  gui.add(params, "archHeight", 0.05, 1.5, 0.05).name("Arch Rise").onChange(rebuild);
  gui.add(params, "depth", 0.02, 0.8, 0.02).name("Depth").onChange(rebuild);
  // 3 = chiselled and faceted. 24 = smooth.
  gui.add(params, "curveSegments", 2, 32, 1).name("Curve Segments").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    slab.geometry.dispose();
    dispose();
  };
}
