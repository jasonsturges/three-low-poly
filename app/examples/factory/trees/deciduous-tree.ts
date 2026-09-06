import GUI from "lil-gui";
import { DeciduousTree, type DeciduousTreeOptions, GroundGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import type { ExampleMeta, ExampleMount } from "../../../framework/example";

export const meta: ExampleMeta = {
  title: "Deciduous Tree",
  description: "A seeded broadleaf tree with seasonal foliage controls. Adjust the trunk, crown, and palette; the original autumn and cherry configurations are preserved in Studies / Trees.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, {
    background: 0x0a0b10,
    cameraPosition: [6, 4, 8],
  });
  const grid = new GroundGrid({ size: 12, divisions: 12 });
  handle.scene.add(grid);

  const params: Required<DeciduousTreeOptions> = {
    seed: 0xa711,
    trunkRadius: 0.32,
    segmentLength: 0.66,
    maxDepth: 4,
    leafDensity: 0.72,
    barkColor: "#332419",
    leafPalette: ["#4e5f33", "#5d7142", "#6b8150", "#455a2e", "#7a8a58"],
    leafSize: 0.38,
    clustersPerPoint: 2,
    baseRise: 0.35,
  };

  let tree = new DeciduousTree(params);
  handle.scene.add(tree);
  frameObject(handle, tree, { fit: 1.25 });

  function rebuild(): void {
    tree.dispose();
    handle.scene.remove(tree);
    tree = new DeciduousTree(params);
    handle.scene.add(tree);
    // Re-center without re-dollying: the crown grows and shrinks as the dials move, and re-fitting on
    // every change would snap the viewer's zoom back.
    frameObject(handle, tree, { dolly: false });
  }

  const gui = new GUI({ title: "Deciduous Tree" });
  gui.add(params, "seed", 1, 0xffff, 1).name("Seed").onChange(rebuild);

  const trunk = gui.addFolder("Trunk");
  trunk.add(params, "trunkRadius", 0.15, 0.6, 0.01).name("Radius").onChange(rebuild);
  trunk.add(params, "segmentLength", 0.35, 1, 0.01).name("Segment length").onChange(rebuild);
  trunk.add(params, "maxDepth", 2, 5, 1).name("Branch depth").onChange(rebuild);
  // At 0 the bottom cap tilts with the lean and drops below y = 0 — the reason this option exists.
  trunk.add(params, "baseRise", 0, 1.2, 0.05).name("Base rise (sits flat)").onChange(rebuild);
  trunk.addColor(params, "barkColor").name("Bark").onChange(rebuild);
  trunk.open();

  const crown = gui.addFolder("Crown");
  crown.add(params, "leafDensity", 0, 1, 0.01).name("Density").onChange(rebuild);
  crown.add(params, "leafSize", 0.12, 0.5, 0.01).name("Cluster size").onChange(rebuild);
  crown.add(params, "clustersPerPoint", 1, 5, 1).name("Clusters / point").onChange(rebuild);
  crown.open();

  // The whole argument for one class: each of these is a palette and a couple of numbers. Watch the
  // branch skeleton stay identical while the tree changes season.
  const seasons: Record<string, () => void> = {
    Summer: () => apply(["#4e5f33", "#5d7142", "#6b8150", "#455a2e", "#7a8a58"], 0.38, 2, "#332419"),
    Autumn: () => apply(["#8d3c1d", "#aa5b21", "#c27a28", "#6e3120", "#b68a32"], 0.38, 2, "#332419"),
    Cherry: () => apply(["#f7d6dc", "#efb9c5", "#f4c8d2", "#dfa2b2", "#f9e2e4"], 0.27, 3, "#493630"),
    Bare: () => apply([], 0.38, 0, "#332419"),
  };
  function apply(palette: string[], leafSize: number, clustersPerPoint: number, bark: string): void {
    params.leafPalette = palette.length ? palette : ["#000000"];
    params.leafDensity = palette.length ? 0.72 : 0;
    params.leafSize = leafSize;
    params.clustersPerPoint = Math.max(1, clustersPerPoint);
    params.barkColor = bark;
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    rebuild();
  }
  const season = gui.addFolder("Season");
  for (const [name, fn] of Object.entries(seasons)) season.add({ [name]: fn }, name);
  season.open();

  return () => {
    gui.destroy();
    tree.dispose();
    grid.dispose();
    handle.scene.clear();
    handle.dispose();
  };
};

export default mount;
