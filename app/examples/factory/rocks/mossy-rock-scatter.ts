import GUI from "lil-gui";
import { GroundGrid, scatterMossyRocks } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Mossy Rock Scatter",
  description: "Instanced mossy rocks — two material groups, seeded scatter in a bounds region.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 4, 10] });

  const floor = new GroundGrid({ size: 12 });
  scene.add(floor);

  const params = {
    useSeed: true,
    seed: 4242,
    count: 20,
    width: 8,
    depth: 8,
    heightJitter: 0,
    scaleMin: 0.6,
    scaleMax: 1.2,
  };

  let rocks = scatterMossyRocks({
    count: params.count,
    width: params.width,
    depth: params.depth,
    heightJitter: params.heightJitter,
    scaleMin: params.scaleMin,
    scaleMax: params.scaleMax,
    seed: params.useSeed ? params.seed : undefined,
  });
  scene.add(rocks);

  const disposeMesh = (mesh: typeof rocks) => {
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((m) => m.dispose());
  };

  const rebuild = () => {
    scene.remove(rocks);
    disposeMesh(rocks);
    rocks = scatterMossyRocks({
      count: params.count,
      width: params.width,
      depth: params.depth,
      heightJitter: params.heightJitter,
      scaleMin: params.scaleMin,
      scaleMax: params.scaleMax,
      seed: params.useSeed ? params.seed : undefined,
    });
    scene.add(rocks);
  };

  const gui = new GUI();
  gui.title("Mossy Rock Scatter");
  gui.add(params, "useSeed").name("Use Seed").onChange(rebuild);
  gui.add(params, "seed", 0, 99999, 1).name("Seed").onChange(rebuild);
  gui.add(params, "count", 1, 80, 1).name("Count").onChange(rebuild);
  gui.add(params, "width", 2, 20, 0.5).name("Width").onChange(rebuild);
  gui.add(params, "depth", 2, 20, 0.5).name("Depth").onChange(rebuild);
  gui.add(params, "heightJitter", 0, 2, 0.05).name("Height Jitter").onChange(rebuild);
  gui.add(params, "scaleMin", 0.2, 2, 0.05).name("Scale Min").onChange(rebuild);
  gui.add(params, "scaleMax", 0.2, 2, 0.05).name("Scale Max").onChange(rebuild);

  return () => {
    gui.destroy();
    scene.remove(rocks);
    disposeMesh(rocks);
    floor.dispose();
    dispose();
  };
}