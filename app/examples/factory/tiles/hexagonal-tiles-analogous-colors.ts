import { Color, InstancedMesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createHexagonalTilesByCount, getAnalogousColors } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Hexagonal Tiles (Analogous Colors)" };

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
    hue: 0,
  };

  const color = new Color();
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

    // Native per-instance color — each tile samples its own ±30° analogous hue.
    for (let i = 0; i < tiles.count; i++) {
      const [r, g, b] = getAnalogousColors(params.hue);
      tiles.setColorAt(i, color.setRGB(r / 0xff, g / 0xff, b / 0xff));
    }
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  };

  const gui = new GUI();
  gui.title("Analogous Colors");
  gui.add(params, "count", 2, 128, 1).name("Count").onChange(update);
  gui.add(params, "hue", 0, 360, 1).name("Hue").onChange(update);

  update();

  return () => {
    gui.destroy();
    tiles?.geometry.dispose();
    material.dispose();
    dispose();
  };
}
