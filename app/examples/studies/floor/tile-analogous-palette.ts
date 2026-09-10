import { Color, InstancedMesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createHexagonalTilesByCount, createRandom, RandomColor } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Tile Analogous Palette",
  description:
    "STUDY — RandomColor.analogous samples neighboring hues with independent saturation and lightness ranges in sRGB. " +
    "The sampler writes working-space colors directly to setColorAt. Lower/upper percentages are sampling bounds; " +
    "set both saturation bounds to zero for grayscale. A fixed seed preserves the random choices as you tune.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 5, 5] });

  // White base so the per-instance color reads directly (native USE_INSTANCING_COLOR).
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.5,
    roughness: 0.5,
    flatShading: true,
  });

  const params = {
    count: 24,
    hue: 30,
    spread: 15,
    saturationMin: 40,
    saturationMax: 60,
    lightnessMin: 35,
    lightnessMax: 55,
    seed: 1337,
  };

  const color = new Color();
  let tiles: InstancedMesh | undefined;

  const recolor = () => {
    if (!tiles) return;
    const sample = RandomColor.analogous({
      hue: params.hue,
      spread: params.spread,
      saturation: [params.saturationMin, params.saturationMax],
      lightness: [params.lightnessMin, params.lightnessMax],
    });
    const context = { index: 0, random: createRandom(params.seed) };
    for (let i = 0; i < tiles.count; i++) {
      context.index = i;
      sample(color, context);
      tiles.setColorAt(i, color);
    }
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  };

  const update = () => {
    if (tiles) {
      scene.remove(tiles);
      tiles.geometry.dispose();
      tiles.dispose();
    }

    tiles = createHexagonalTilesByCount({
      width: 10,
      depth: 10,
      height: 0.01,
      count: params.count,
      gap: 0.01,
      material,
    });
    scene.add(tiles);

    recolor();
  };

  const gui = new GUI();
  gui.title("Analogous Colors");
  gui.add(params, "count", 2, 128, 1).name("Count").onChange(update);
  gui.add(params, "hue", 0, 360, 1).name("Hue degrees").onChange(recolor);
  gui.add(params, "spread", 0, 180, 1).name("Spread ±degrees").onChange(recolor);
  gui.add(params, "seed", 1, 9999, 1).name("Seed").onChange(recolor);
  for (const channel of ["saturation", "lightness"] as const) {
    const group = gui.addFolder(channel === "saturation" ? "Saturation" : "Lightness");
    const lower = `${channel}Min` as const;
    const upper = `${channel}Max` as const;
    group
      .add(params, lower, 0, 100, 1)
      .name("Lower %")
      .onChange(() => {
        params[upper] = Math.max(params[lower], params[upper]);
        group.controllers.forEach((controller) => controller.updateDisplay());
        recolor();
      });
    group
      .add(params, upper, 0, 100, 1)
      .name("Upper %")
      .onChange(() => {
        params[lower] = Math.min(params[lower], params[upper]);
        group.controllers.forEach((controller) => controller.updateDisplay());
        recolor();
      });
  }

  update();

  return () => {
    gui.destroy();
    tiles?.geometry.dispose();
    tiles?.dispose();
    material.dispose();
    dispose();
  };
}
