import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";
import { createPumpkinStemGeometry, GroundGrid, type PumpkinStemGeometryOptions } from "three-low-poly";
import type { ExampleMeta, ExampleMount } from "../../framework/example";

export const meta: ExampleMeta = {
  description:
    "The pumpkin stem component factory in isolation — no rind, no composite placement. Sits on a GroundGrid so its resting position reads clearly: the factory pivots the cylinder so its base sits at the local origin (y = 0). Lean, twist, and seating belong to the assembly layer, not here. Tune every stem parameter live.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, {
    background: 0x0a0b10,
    cameraPosition: [4, 2.5, 6],
  });
  const { scene } = handle;

  // Ground reference so the factory's base-at-origin pivot is visible, plus an
  // origin marker — the stem leans about this point, so it reads as the anchor a
  // caller would translate onto a rind.
  const grid = new GroundGrid({ size: 8, divisions: 8 });
  const axes = new AxesHelper(1.5);
  scene.add(grid, axes);

  // The stem renders with a single material — no groups yet. Groups only enter
  // once the composite (rind + stem) exists.
  const material = new MeshStandardMaterial({
    color: new Color("#30311f"),
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  // These defaults are hand-copied from the factory's own defaults — a
  // deliberate duplication that makes the "single source of truth for defaults"
  // question concrete rather than solving it yet.
  const params: Required<PumpkinStemGeometryOptions> = {
    stemTopRadius: 0.1,
    stemBottomRadius: 0.14,
    stemHeight: 0.38,
    stemSegments: 5,
  };

  const mesh = new Mesh(createPumpkinStemGeometry(params), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Rebuild the geometry in place: parameters are baked at construction, so any
  // change means a fresh BufferGeometry. Camera is left where it is so the shape
  // can be compared against a stable frame while tuning.
  function rebuild(): void {
    mesh.geometry.dispose();
    mesh.geometry = createPumpkinStemGeometry(params);
  }

  frameObject(handle, mesh);

  const gui = new GUI();
  gui.title("Stem");
  gui.add(params, "stemTopRadius", 0.02, 0.3, 0.005).name("Top radius").onChange(rebuild);
  gui.add(params, "stemBottomRadius", 0.02, 0.3, 0.005).name("Bottom radius").onChange(rebuild);
  gui.add(params, "stemHeight", 0.1, 1, 0.01).name("Height").onChange(rebuild);
  gui.add(params, "stemSegments", 3, 16, 1).name("Segments").onChange(rebuild);

  return () => {
    gui.destroy();
    mesh.geometry.dispose();
    material.dispose();
    grid.dispose();
    axes.dispose();
    scene.clear();
    handle.dispose();
  };
};

export default mount;
