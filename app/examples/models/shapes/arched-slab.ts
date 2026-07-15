import GUI from "lil-gui";
import { ArchedSlab, ArchedSlabGeometry, ArchStyle, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Arched Slab" };

const ARCHES: ArchStyle[] = [
  "square",
  "segmental",
  "semicircle",
  "horseshoe",
  "elliptical",
  "pointed",
  "ogee",
];

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x6e7a86 });

  const params = {
    arch: "semicircle" as ArchStyle,
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

  const gui = new GUI();
  gui.title("Arched Slab");

  // One outline, the whole arch vocabulary on top — a door, a window, a headstone are all this slab with
  // a different arch and span. See the Arch Profiles reference for the styles side by side.
  gui.add(params, "arch", ARCHES).name("Arch").onChange(rebuild);
  gui.add(params, "width", 0.3, 2, 0.05).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.2, 2.5, 0.05).name("Body Height").onChange(rebuild);
  // Pull this BELOW the width and shoulders appear — the arch sits ON the slab. That is the headstone.
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
