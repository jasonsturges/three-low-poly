import { Group, InstancedMesh, Material } from "three";
import GUI from "lil-gui";
import { scatterBoulders } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { GroundGrid } from "../../../framework/GroundGrid";

export const meta = {
  title: "Boulder Scatter",
  description:
    "A field of noise-lumped boulders — several distinct geometries distributed across " +
    "instances (one draw call per variant), seeded via createRandom().",
};

function disposeField(group: Group): void {
  const materials = new Set<Material>();
  group.traverse((object) => {
    if (object instanceof InstancedMesh) {
      object.geometry.dispose();
      (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) => materials.add(m));
    }
  });
  materials.forEach((material) => material.dispose());
}

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, { cameraPosition: [0, 6, 13] });

  controls.target.set(0, 0.5, 0);
  controls.update();

  const floor = new GroundGrid({ size: 16 });
  scene.add(floor);

  const params = {
    useSeed: true,
    seed: 1337,
    count: 24,
    width: 12,
    depth: 12,
    variants: 4,
    radius: 1,
    detail: 2,
    noiseHeight: 0.35,
    noiseScale: 1.6,
    scaleMin: 0.6,
    scaleMax: 1.3,
    color: "#6f6f6f",
  };

  const build = () =>
    scatterBoulders({
      count: params.count,
      width: params.width,
      depth: params.depth,
      variants: params.variants,
      radius: params.radius,
      detail: params.detail,
      noiseHeight: params.noiseHeight,
      noiseScale: params.noiseScale,
      scaleMin: params.scaleMin,
      scaleMax: params.scaleMax,
      color: params.color,
      seed: params.useSeed ? params.seed : undefined,
    });

  let boulders = build();
  scene.add(boulders);

  const rebuild = () => {
    scene.remove(boulders);
    disposeField(boulders);
    boulders = build();
    scene.add(boulders);
  };

  const gui = new GUI();
  gui.title("Boulder Scatter");

  const fieldFolder = gui.addFolder("Field");
  fieldFolder.add(params, "useSeed").name("Use Seed").onChange(rebuild);
  fieldFolder.add(params, "seed", 0, 99999, 1).name("Seed").onChange(rebuild);
  fieldFolder.add(params, "count", 1, 120, 1).name("Count").onChange(rebuild);
  fieldFolder.add(params, "width", 4, 24, 0.5).name("Width").onChange(rebuild);
  fieldFolder.add(params, "depth", 4, 24, 0.5).name("Depth").onChange(rebuild);
  fieldFolder.add(params, "variants", 1, 12, 1).name("Variants").onChange(rebuild);
  fieldFolder.open();

  const boulderFolder = gui.addFolder("Boulder");
  boulderFolder.add(params, "radius", 0.3, 3, 0.1).name("Radius").onChange(rebuild);
  boulderFolder.add(params, "detail", 0, 4, 1).name("Detail").onChange(rebuild);
  boulderFolder.add(params, "noiseHeight", 0, 1, 0.01).name("Relief").onChange(rebuild);
  boulderFolder.add(params, "noiseScale", 0.4, 4, 0.05).name("Noise Scale").onChange(rebuild);
  boulderFolder.add(params, "scaleMin", 0.2, 2, 0.05).name("Scale Min").onChange(rebuild);
  boulderFolder.add(params, "scaleMax", 0.2, 2.5, 0.05).name("Scale Max").onChange(rebuild);
  boulderFolder.addColor(params, "color").name("Color").onChange(rebuild);

  return () => {
    gui.destroy();
    scene.remove(boulders);
    disposeField(boulders);
    floor.dispose();
    dispose();
  };
}
