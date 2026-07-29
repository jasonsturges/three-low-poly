import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { createPumpkinRindGeometry, GroundGrid, type PumpkinRindGeometryOptions } from "three-low-poly";
import type { ExampleMeta, ExampleMount } from "../../../framework/example";

export const meta: ExampleMeta = {
  description:
    "The pumpkin rind component factory in isolation — no stem, no cluster. Sits on a GroundGrid so its resting position reads clearly: the factory lifts the sphere so its base rests on the local XZ plane (y = 0). Tune every rind parameter live.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, {
    background: 0x0a0b10,
    cameraPosition: [4, 2.5, 6],
  });
  const { scene } = handle;

  // Ground reference so the factory's resting-on-XZ translate is visible, plus
  // an origin marker to read where the local origin sits relative to the base.
  const grid = new GroundGrid({ size: 8, divisions: 8 });
  const axes = new AxesHelper(1.5);
  scene.add(grid, axes);

  // The rind renders with a single material — no groups yet. Groups only enter
  // once the composite (rind + stem) exists.
  const material = new MeshStandardMaterial({
    color: new Color("#804319"),
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });

  // These defaults are hand-copied from the factory's own defaults — a
  // deliberate duplication that makes the "single source of truth for defaults"
  // question concrete rather than solving it yet.
  const params: Required<PumpkinRindGeometryOptions> = {
    rindRadius: 1,
    rindWidthSegments: 16,
    rindHeightSegments: 8,
    rindRibs: 8,
    rindRibDepth: 0.075,
    rindSquash: 0.82,
  };

  const mesh = new Mesh(createPumpkinRindGeometry(params), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Rebuild the geometry in place: parameters are baked at construction, so any
  // change means a fresh BufferGeometry. Camera is left where it is so the shape
  // can be compared against a stable frame while tuning.
  function rebuild(): void {
    mesh.geometry.dispose();
    mesh.geometry = createPumpkinRindGeometry(params);
  }

  frameObject(handle, mesh);

  const gui = new GUI();
  gui.title("Rind");
  gui.add(params, "rindRadius", 0.1, 2, 0.01).name("Radius").onChange(rebuild);
  gui.add(params, "rindWidthSegments", 3, 48, 1).name("Width segments").onChange(rebuild);
  gui.add(params, "rindHeightSegments", 2, 32, 1).name("Height segments").onChange(rebuild);
  gui.add(params, "rindRibs", 0, 24, 1).name("Ribs").onChange(rebuild);
  gui.add(params, "rindRibDepth", 0, 0.3, 0.005).name("Rib depth").onChange(rebuild);
  gui.add(params, "rindSquash", 0.3, 1.5, 0.01).name("Squash").onChange(rebuild);

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
