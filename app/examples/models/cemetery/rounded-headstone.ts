import GUI from "lil-gui";
import { ArchStyle, RoundedHeadstone, RoundedHeadstoneGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Rounded Headstone" };

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
  const { scene, dispose } = createScene(container);

  const params = {
    width: 0.6,
    height: 0.7,
    archWidth: 0.6,
    archHeight: 0.3,
    depth: 0.2,
    arch: "semicircle" as ArchStyle,
    curveSegments: 16,
  };

  const roundedHeadstone = new RoundedHeadstone();
  scene.add(roundedHeadstone);
  centerObject(roundedHeadstone);

  const rebuild = () => {
    roundedHeadstone.geometry.dispose();
    roundedHeadstone.geometry = new RoundedHeadstoneGeometry(params);
    centerObject(roundedHeadstone);
  };

  const gui = new GUI();
  gui.title("Rounded Headstone");
  // The headstone IS an arched slab, so the whole vocabulary is here — including the ogee.
  gui.add(params, "arch", ARCHES).name("Arch").onChange(rebuild);
  gui.add(params, "width", 0.2, 2, 0.05).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.2, 2, 0.05).name("Body Height").onChange(rebuild);
  // Pull this in under the width and SHOULDERS appear at the corners — the shape you see in every real
  // cemetery, and the one this headstone could not make back when it was a box glued to a cylinder.
  gui.add(params, "archWidth", 0.1, 2, 0.05).name("Arch Span").onChange(rebuild);
  gui.add(params, "archHeight", 0.05, 1, 0.05).name("Arch Rise").onChange(rebuild);
  gui.add(params, "depth", 0.05, 1, 0.05).name("Depth").onChange(rebuild);
  gui.add(params, "curveSegments", 2, 32, 1).name("Curve Segments").onChange(rebuild);

  return () => {
    gui.destroy();
    roundedHeadstone.geometry.dispose();
    roundedHeadstone.material.dispose();
    dispose();
  };
}
