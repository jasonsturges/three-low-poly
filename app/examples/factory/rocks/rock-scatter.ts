import GUI from "lil-gui";
import { GroundGrid, scatterRocks } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Rock Scatter",
  description: "Instanced rock scatter inside a bounds region — seeded via createRandom().",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 4, 10] });

  const floor = new GroundGrid({ size: 12 });
  scene.add(floor);

  const params = {
    useSeed: true,
    seed: 1337,
    count: 24,
    width: 8,
    depth: 8,
    heightJitter: 0,
    scaleMin: 0.5,
    scaleMax: 1.1,
  };

  let rocks = scatterRocks({
    count: params.count,
    width: params.width,
    depth: params.depth,
    heightJitter: params.heightJitter,
    scaleMin: params.scaleMin,
    scaleMax: params.scaleMax,
    seed: params.useSeed ? params.seed : undefined,
  });
  scene.add(rocks);

  const rebuild = () => {
    scene.remove(rocks);
    rocks.geometry.dispose();
    const material = Array.isArray(rocks.material) ? rocks.material[0] : rocks.material;
    material.dispose();
    rocks = scatterRocks({
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
  gui.title("Rock Scatter");
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
    rocks.geometry.dispose();
    const material = Array.isArray(rocks.material) ? rocks.material[0] : rocks.material;
    material.dispose();
    floor.dispose();
    dispose();
  };
}