import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";
import type { ExampleMeta, ExampleMount } from "../../framework/example";
import { GroundGrid, WeatheredPlankGeometry, type WeatheredPlankGeometryOptions } from "three-low-poly";

export const meta: ExampleMeta = {
  description:
    "One reusable rough-sawn board, authored along local X. Seeded edge wander, end skew, surface variation, and a subtle bow shape the board; installation gaps remain the responsibility of wall, floor, and roof assemblies.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, {
    background: 0x0a0b10,
    cameraPosition: [4, 2.5, 5],
  });
  const grid = new GroundGrid({ size: 8, divisions: 8 });
  const axes = new AxesHelper(1.5);
  handle.scene.add(grid, axes);

  const params: Required<WeatheredPlankGeometryOptions> = {
    length: 3,
    width: 0.45,
    thickness: 0.14,
    seed: 137,
    roughness: 0.055,
    bow: 0.12,
    endSkew: 0.08,
  };
  const material = new MeshStandardMaterial({
    color: new Color("#654029"),
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const plank = new Mesh(new WeatheredPlankGeometry(params), material);
  plank.position.y = 0.6;
  plank.castShadow = plank.receiveShadow = true;
  handle.scene.add(plank);
  frameObject(handle, plank, { fit: 1.5 });

  function rebuild(): void {
    plank.geometry.dispose();
    plank.geometry = new WeatheredPlankGeometry(params);
  }

  const gui = new GUI({ title: "Weathered Plank" });
  gui.add(params, "length", 0.5, 6, 0.05).onChange(rebuild);
  gui.add(params, "width", 0.1, 1, 0.01).onChange(rebuild);
  gui.add(params, "thickness", 0.03, 0.4, 0.01).onChange(rebuild);
  gui.add(params, "seed", 1, 0xffff, 1).onChange(rebuild);
  gui
    .add(params, "roughness", 0, 0.2, 0.005)
    .name("Edge roughness")
    .onChange(rebuild);
  gui.add(params, "bow", 0, 0.5, 0.01).onChange(rebuild);
  gui.add(params, "endSkew", 0, 0.25, 0.005).name("End skew").onChange(rebuild);

  return () => {
    gui.destroy();
    plank.geometry.dispose();
    material.dispose();
    grid.dispose();
    axes.dispose();
    handle.scene.clear();
    handle.dispose();
  };
};

export default mount;
