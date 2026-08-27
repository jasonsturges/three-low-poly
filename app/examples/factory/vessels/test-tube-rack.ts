import GUI from "lil-gui";
import { Mesh } from "three";
import { TestTubeRack, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Test Tube Rack" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    columns: 6,
    rows: 1,
    radius: 0.2,
    height: 3,
    gap: 0.18,
    rise: 0.55,
    fill: 0.5,
    color: 0x4bbfa0,
    glow: 0.6,
  };

  const build = () =>
    new TestTubeRack({
      columns: params.columns,
      rows: params.rows,
      gap: params.gap,
      rise: params.rise,
      tube: { radius: params.radius, height: params.height },
      fill:
        params.fill > 0
          ? { fill: params.fill, color: params.color, glow: params.glow, opacity: 0.88, inset: 0.06 }
          : undefined,
    });

  const disposeAssembly = (group: TestTubeRack) => {
    group.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  };

  let rack = build();
  scene.add(rack);
  centerObject(rack);

  const rebuild = () => {
    scene.remove(rack);
    disposeAssembly(rack);
    rack = build();
    scene.add(rack);
    centerObject(rack);
  };

  const gui = new GUI();
  gui.title("Test Tube Rack");
  gui.add(params, "columns", 1, 12, 1).name("Columns").onChange(rebuild);
  gui.add(params, "rows", 1, 6, 1).name("Rows").onChange(rebuild);
  gui.add(params, "gap", 0, 0.6, 0.01).name("Gap").onChange(rebuild);
  gui.add(params, "rise", 0.15, 0.9, 0.01).name("Rise").onChange(rebuild);

  const tube = gui.addFolder("Tube");
  tube.add(params, "radius", 0.08, 0.4, 0.01).name("Radius").onChange(rebuild);
  tube.add(params, "height", 1, 4, 0.05).name("Height").onChange(rebuild);
  tube.open();

  const fill = gui.addFolder("Fill");
  fill.add(params, "fill", 0, 1, 0.01).name("Fill").onChange(rebuild);
  fill.addColor(params, "color").name("Color").onChange(rebuild);
  fill.add(params, "glow", 0, 2, 0.01).name("Glow").onChange(rebuild);
  fill.open();

  return () => {
    gui.destroy();
    scene.remove(rack);
    disposeAssembly(rack);
    dispose();
  };
}
