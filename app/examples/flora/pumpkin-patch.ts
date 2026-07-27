import GUI from "lil-gui";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";
import { GroundGrid, PumpkinPatch, type PumpkinPatchOptions } from "three-low-poly";
import type { ExampleMeta, ExampleMount } from "../../framework/example";

export const meta: ExampleMeta = {
  description:
    "The instancing half of the pattern: a field of pumpkins batched into two draw calls — one rind InstancedMesh, one stem InstancedMesh. Per-instance setColorAt tints every rind (why geometry stayed separable). lean/twist/sink/drift are seeded *max* ranges for organic, non-repeating variety.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, {
    background: 0x0a0b10,
    cameraPosition: [10, 9, 14],
  });
  const { scene } = handle;

  const params: Required<PumpkinPatchOptions> = {
    rows: 12,
    columns: 16,
    spacing: 0.9,
    seed: 0x51a7,
    scaleMin: 0.22,
    scaleMax: 0.38,
    stemLeanMax: 0.35,
    stemSinkMax: 0.06,
    leanMax: 0.08,
    twistMax: Math.PI,
    sinkMax: 0.05,
    driftMax: 0.18,
    colorVariance: 0.08,
  };

  const cost = { pumpkins: 0, drawCalls: 0 };

  let patch = new PumpkinPatch(params);
  let grid = new GroundGrid({ size: 8 });
  scene.add(patch, grid);

  function rebuild(): void {
    patch.dispose();
    scene.remove(patch);
    grid.dispose();
    scene.remove(grid);

    patch = new PumpkinPatch(params);
    scene.add(patch);

    const size = Math.max(params.columns * params.spacing, params.rows * params.spacing) + 2;
    grid = new GroundGrid({ size: Math.ceil(size) });
    scene.add(grid);

    cost.pumpkins = params.rows * params.columns;
    cost.drawCalls = patch.children.length;
  }

  rebuild();
  // Frame once, not on every rebuild — so tweaking a parameter keeps whatever
  // camera position you've orbited/zoomed to, the way the headstone example does.
  frameObject(handle, patch, { fit: 1.1 });

  const gui = new GUI();
  gui.title("Pumpkin Patch");

  const field = gui.addFolder("Field");
  field.add(params, "rows", 1, 40, 1).name("Rows").onChange(rebuild);
  field.add(params, "columns", 1, 40, 1).name("Columns").onChange(rebuild);
  field.add(params, "spacing", 0.5, 2, 0.05).name("Spacing").onChange(rebuild);
  field.add(params, "seed", 1, 0xffff, 1).name("Seed").onChange(rebuild);

  const stem = gui.addFolder("Stem (max)");
  stem.add(params, "stemLeanMax", 0, 0.8, 0.01).name("Lean").onChange(rebuild);
  stem.add(params, "stemSinkMax", 0, 0.2, 0.005).name("Sink").onChange(rebuild);

  const unit = gui.addFolder("Unit (max)");
  unit.add(params, "leanMax", 0, 0.4, 0.005).name("Lean").onChange(rebuild);
  unit.add(params, "twistMax", 0, Math.PI, 0.01).name("Twist").onChange(rebuild);
  unit.add(params, "sinkMax", 0, 0.3, 0.005).name("Sink").onChange(rebuild);
  unit.add(params, "driftMax", 0, 0.5, 0.01).name("Drift").onChange(rebuild);

  const size = gui.addFolder("Size");
  size.add(params, "scaleMin", 0.1, 0.6, 0.01).name("Scale min").onChange(rebuild);
  size.add(params, "scaleMax", 0.1, 0.8, 0.01).name("Scale max").onChange(rebuild);

  const appearance = gui.addFolder("Appearance");
  appearance.add(params, "colorVariance", 0, 0.3, 0.005).name("Color variance").onChange(rebuild);

  const perf = gui.addFolder("Cost");
  perf.add(cost, "pumpkins").name("Pumpkins").listen().disable();
  perf.add(cost, "drawCalls").name("Draw calls").listen().disable();
  perf.open();

  return () => {
    gui.destroy();
    patch.dispose();
    grid.dispose();
    scene.clear();
    handle.dispose();
  };
};

export default mount;
