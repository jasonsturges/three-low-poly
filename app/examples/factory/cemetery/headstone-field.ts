import GUI from "lil-gui";
import { Group, InstancedMesh, Material } from "three";
import { fieldOfHeadstones, GroundGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Headstone Field",
  description:
    "A whole graveyard — a grid of aged rows sharing one instanced mesh per silhouette, so ten thousand " +
    "stones stay a handful of draw calls.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x2b3038,
    cameraPosition: [0, 10, 22],
  });

  controls.target.set(0, 0, 0);
  controls.update();

  const params = {
    columns: 12,
    rows: 12,
    spacing: 1,
    rowSpacing: 2.2,
    density: 1,
    seed: 1337,
    leanMax: 0.12,
    twistMax: 0.4,
    sinkMax: 0.08,
    driftMax: 0.05,
    weathering: 0.09,
  };

  const stats = { stones: 0, drawCalls: 0 };

  let field = new Group();
  let floor = new GroundGrid();

  const disposeField = () => {
    for (const mesh of field.children) (mesh as InstancedMesh).geometry.dispose();
    const shared = (field.children[0] as InstancedMesh | undefined)?.material as Material | undefined;
    shared?.dispose();
  };

  const rebuild = () => {
    disposeField();
    scene.remove(field);
    floor.dispose();
    scene.remove(floor);

    field = fieldOfHeadstones(params);
    field.traverse((child) => {
      if (child instanceof InstancedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // The field runs from the origin out along +x / +z; center it under the camera.
    const width = (params.columns - 1) * params.spacing;
    const depth = (params.rows - 1) * params.rowSpacing;
    field.position.set(-width / 2, 0, -depth / 2);
    scene.add(field);

    stats.stones = field.children.reduce((n, c) => n + (c as InstancedMesh).count, 0);
    stats.drawCalls = field.children.length;

    const size = Math.max(width, depth) + 4;
    floor = new GroundGrid({ size });
    scene.add(floor);
  };

  rebuild();

  const gui = new GUI();
  gui.title("Headstone Field");

  const plot = gui.addFolder("Plot Grid");
  plot.add(params, "columns", 1, 60, 1).name("Columns").onChange(rebuild);
  plot.add(params, "rows", 1, 60, 1).name("Rows").onChange(rebuild);
  plot.add(params, "spacing", 0.6, 2, 0.05).name("Column Pitch").onChange(rebuild);
  plot.add(params, "rowSpacing", 1, 4, 0.05).name("Row Pitch").onChange(rebuild);
  // Below 1, plots are left empty at random — the gaps of an old churchyard, or a sparse distant fill.
  plot.add(params, "density", 0.05, 1, 0.01).name("Density").onChange(rebuild);
  plot.add(params, "seed", 1, 9999, 1).name("Seed").onChange(rebuild);
  plot.open();

  const age = gui.addFolder("Settling");
  age.add(params, "leanMax", 0, 0.4, 0.005).name("Lean").onChange(rebuild);
  age.add(params, "twistMax", 0, 1.2, 0.01).name("Twist").onChange(rebuild);
  age.add(params, "sinkMax", 0, 0.4, 0.005).name("Sink").onChange(rebuild);
  age.add(params, "driftMax", 0, 0.3, 0.005).name("Drift").onChange(rebuild);
  age.add(params, "weathering", 0, 0.3, 0.005).name("Weathering").onChange(rebuild);

  // The whole point, on screen: many stones, few draw calls.
  const perf = gui.addFolder("Cost");
  perf.add(stats, "stones").name("Stones").listen().disable();
  perf.add(stats, "drawCalls").name("Draw Calls").listen().disable();
  perf.open();

  return () => {
    gui.destroy();
    disposeField();
    floor.dispose();
    dispose();
  };
}
