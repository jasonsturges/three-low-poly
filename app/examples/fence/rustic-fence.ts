import GUI from "lil-gui";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";
import type { ExampleMeta, ExampleMount } from "../../framework/example";
import { GroundGrid, RusticFence, type RusticFenceOptions } from "three-low-poly";

export const meta: ExampleMeta = {
  description:
    "A reusable run of rough-hewn split-rail fence. Posts and rails share one low-poly timber geometry; seeded lean, twist, height, color, and crossing offsets keep the silhouette handmade while the run remains deterministic.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, {
    background: 0x0a0b10,
    cameraPosition: [7, 4, 8],
  });

  const params: Required<RusticFenceOptions> = {
    sections: 4,
    sectionLength: 2.4,
    railCount: 3,
    postHeight: 1.65,
    postThickness: 0.22,
    railThickness: 0.16,
    seed: 0xf3ce,
  };

  let fence = new RusticFence(params);
  const grid = new GroundGrid({ size: 14, divisions: 14 });
  handle.scene.add(grid, fence);
  frameObject(handle, fence, { fit: 1.35 });

  function rebuild(): void {
    fence.dispose();
    handle.scene.remove(fence);
    fence = new RusticFence(params);
    handle.scene.add(fence);
  }

  const gui = new GUI({ title: "Rustic Fence" });
  gui.add(params, "sections", 1, 12, 1).name("Sections").onChange(rebuild);
  gui
    .add(params, "sectionLength", 1.2, 4, 0.05)
    .name("Bay length")
    .onChange(rebuild);
  gui
    .add(params, "railCount", { Two: 2, Three: 3 })
    .name("Rails")
    .onChange(rebuild);
  gui
    .add(params, "postHeight", 0.8, 3, 0.05)
    .name("Post height")
    .onChange(rebuild);
  gui
    .add(params, "postThickness", 0.1, 0.5, 0.01)
    .name("Post width")
    .onChange(rebuild);
  gui
    .add(params, "railThickness", 0.08, 0.35, 0.01)
    .name("Rail width")
    .onChange(rebuild);
  gui.add(params, "seed", 1, 0xffff, 1).name("Seed").onChange(rebuild);

  return () => {
    gui.destroy();
    fence.dispose();
    grid.dispose();
    handle.scene.clear();
    handle.dispose();
  };
};

export default mount;
