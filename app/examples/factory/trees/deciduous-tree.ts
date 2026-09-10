import GUI from "lil-gui";
import { DeciduousTree, type DeciduousTreeOptions, GroundGrid, RandomColor, type ColorSampler } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import type { ExampleMeta, ExampleMount } from "../../../framework/example";

export const meta: ExampleMeta = {
  title: "Deciduous Tree",
  description:
    "Summer, Autumn, and Cherry Blossom are example presets: each supplies leafPalette plus cluster size, clustersPerPoint, and barkColor. The factory applies its original palette sampling. Two endpoints supplies leafColors: RandomColor.between(a, b), overriding leafPalette while keeping the last selected tree shape. Its endpoints start from the last preset and can be edited. Bare toggles the exposed leaf mesh’s visibility. These preset names are not SDK options; they demonstrate configurations of the properties below.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, {
    background: 0x0a0b10,
    cameraPosition: [6, 4, 8],
  });
  const grid = new GroundGrid({ size: 12, divisions: 12 });
  handle.scene.add(grid);

  const params: Required<Omit<DeciduousTreeOptions, "leafColors">> = {
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

  const seasons = {
    Summer: {
      palette: ["#4e5f33", "#5d7142", "#6b8150", "#455a2e", "#7a8a58"],
      size: 0.38,
      clusters: 2,
      bark: "#332419",
      start: "#455a2e",
      end: "#7a8a58",
    },
    Autumn: {
      palette: ["#8d3c1d", "#aa5b21", "#c27a28", "#6e3120", "#b68a32"],
      size: 0.38,
      clusters: 2,
      bark: "#332419",
      start: "#8d3c1d",
      end: "#b68a32",
    },
    "Cherry Blossom": {
      palette: ["#f7d6dc", "#efb9c5", "#f4c8d2", "#dfa2b2", "#f9e2e4"],
      size: 0.27,
      clusters: 3,
      bark: "#493630",
      start: "#dfa2b2",
      end: "#f9e2e4",
    },
  };
  const colorSettings = {
    mode: "Summer",
    start: seasons.Summer.start,
    end: seasons.Summer.end,
    bare: false,
  };
  function leafColors(): ColorSampler | undefined {
    switch (colorSettings.mode) {
      case "Two endpoints":
        return RandomColor.between(colorSettings.start, colorSettings.end);
      default:
        return undefined;
    }
  }
  const makeTree = () => {
    const result = new DeciduousTree({ ...params, leafColors: leafColors() });
    // Visibility is independent of palette, density, and the seeded cluster layout.
    result.leaves.visible = !colorSettings.bare && result.leaves.count > 0;
    return result;
  };
  let tree = makeTree();
  handle.scene.add(tree);
  frameObject(handle, tree, { fit: 1.25 });

  function rebuild(): void {
    tree.dispose();
    handle.scene.remove(tree);
    tree = makeTree();
    handle.scene.add(tree);
    // Re-center without re-dollying: the crown grows and shrinks as the dials move, and re-fitting on
    // every change would snap the viewer's zoom back.
    frameObject(handle, tree, { dolly: false });
  }

  const gui = new GUI({ title: "Deciduous Tree" });
  gui.add(params, "seed", 1, 0xffff, 1).name("Seed").onChange(rebuild);

  const colors = gui.addFolder("Leaf colors");
  const method = colors.add(colorSettings, "mode", [...Object.keys(seasons), "Two endpoints"]).name("Leaf colors");
  const startControl = colors.addColor(colorSettings, "start").name("Endpoint A").onChange(rebuild);
  const endControl = colors.addColor(colorSettings, "end").name("Endpoint B").onChange(rebuild);
  const syncColors = () => {
    const endpoints = colorSettings.mode === "Two endpoints";
    startControl.show(endpoints);
    endControl.show(endpoints);
  };
  method.onChange(() => {
    if (colorSettings.mode !== "Two endpoints") {
      const preset = seasons[colorSettings.mode as keyof typeof seasons];
      params.leafPalette = [...preset.palette];
      params.leafSize = preset.size;
      params.clustersPerPoint = preset.clusters;
      params.barkColor = preset.bark;
      colorSettings.start = preset.start;
      colorSettings.end = preset.end;
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    }
    syncColors();
    rebuild();
  });
  syncColors();

  const trunk = gui.addFolder("Trunk");
  trunk.add(params, "trunkRadius", 0.15, 0.6, 0.01).name("Radius").onChange(rebuild);
  trunk.add(params, "segmentLength", 0.35, 1, 0.01).name("Segment length").onChange(rebuild);
  trunk.add(params, "maxDepth", 2, 5, 1).name("Branch depth").onChange(rebuild);
  // At 0 the bottom cap tilts with the lean and drops below y = 0 — the reason this option exists.
  trunk.add(params, "baseRise", 0, 1.2, 0.05).name("Base rise (sits flat)").onChange(rebuild);
  trunk.addColor(params, "barkColor").name("Bark").onChange(rebuild);
  trunk.open();

  const crown = gui.addFolder("Crown");
  crown
    .add(colorSettings, "bare")
    .name("Bare (hide leaves)")
    .onChange(() => {
      tree.leaves.visible = !colorSettings.bare && tree.leaves.count > 0;
    });
  crown.add(params, "leafDensity", 0, 1, 0.01).name("Density").onChange(rebuild);
  crown.add(params, "leafSize", 0.12, 0.5, 0.01).name("Cluster size").onChange(rebuild);
  crown.add(params, "clustersPerPoint", 1, 5, 1).name("Clusters / point").onChange(rebuild);
  crown.open();

  return () => {
    gui.destroy();
    tree.dispose();
    grid.dispose();
    handle.scene.clear();
    handle.dispose();
  };
};

export default mount;
