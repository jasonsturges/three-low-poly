import { Color, InstancedMesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createHexagonalTilesByCount } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Tile Color Intervals",
  description:
    "STUDY — PATTERN out of arithmetic. Every Nth tile takes the highlight color and the rest take the " +
    "base, so the only input is an integer — and because a hexagonal packing runs its index along rows " +
    "that do not align with the grid, the interval interferes with the row length and throws out spirals, " +
    "stripes and lattices that nobody authored. Drag Interval slowly: the pattern is a function of how the " +
    "interval and the row width divide each other, so nearby values look nothing alike. Same capability as " +
    "the analogous palette study — a white material and `setColorAt` — used for rhythm instead of variance.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 5, 5] });

  // White base so the per-instance color reads directly (standard materials
  // multiply the base color by instanceColor via native USE_INSTANCING_COLOR).
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.5,
    roughness: 0.5,
    flatShading: true,
  });

  const params = {
    count: 127,
    interval: 24,
  };

  const highlight = new Color(0x000f89);
  const base = new Color(0.8, 0.8, 0.8);

  let tiles: InstancedMesh | undefined;

  const update = () => {
    if (tiles) {
      scene.remove(tiles);
      tiles.geometry.dispose();
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

    // Native per-instance color — setColorAt lazily allocates instanceColor.
    for (let i = 0; i < tiles.count; i++) {
      tiles.setColorAt(i, i % params.interval === 0 ? highlight : base);
    }
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  };

  const gui = new GUI();
  gui.title("Hexagonal Tile");
  gui.add(params, "count", 2, 128, 1).name("Count").onChange(update);
  gui.add(params, "interval", 0, 360, 1).name("Interval").onChange(update);

  update();

  return () => {
    gui.destroy();
    tiles?.geometry.dispose();
    material.dispose();
    dispose();
  };
}
