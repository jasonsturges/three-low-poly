import GUI from "lil-gui";
import { Boulder, BoulderGeometry, GroundGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Boulder",
  description:
    "Icosphere lumped by coherent 3D fbm displaced along the radial normal — the 3D " +
    "counterpart to the terrain noise. Welded first, so the surface never cracks.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, { cameraPosition: [3, 2.4, 4] });

  controls.target.set(0, 0.6, 0);
  controls.update();

  const floor = new GroundGrid({ size: 12 });
  scene.add(floor);

  const params = {
    radius: 1,
    detail: 2,
    noiseHeight: 0.35,
    noiseScale: 1.6,
    octaves: 3,
    persistence: 0.5,
    seed: 1,
    color: "#6f6f6f",
    flatShading: true,
  };

  const boulder = new Boulder(params);
  const seat = () => {
    boulder.geometry.computeBoundingBox();
    boulder.position.y = -(boulder.geometry.boundingBox?.min.y ?? 0);
  };
  seat();
  scene.add(boulder);

  const rebuild = () => {
    boulder.geometry.dispose();
    boulder.geometry = new BoulderGeometry(params);
    seat();
  };

  const gui = new GUI();
  gui.title("Boulder");

  const shapeFolder = gui.addFolder("Shape");
  shapeFolder.add(params, "radius", 0.3, 4, 0.1).name("Radius").onChange(rebuild);
  shapeFolder.add(params, "detail", 0, 5, 1).name("Detail").onChange(rebuild);
  shapeFolder.open();

  const noiseFolder = gui.addFolder("Noise");
  noiseFolder.add(params, "noiseHeight", 0, 1, 0.01).name("Relief").onChange(rebuild);
  noiseFolder.add(params, "noiseScale", 0.4, 4, 0.05).name("Scale").onChange(rebuild);
  noiseFolder.add(params, "octaves", 1, 6, 1).name("Octaves").onChange(rebuild);
  noiseFolder.add(params, "persistence", 0.1, 0.9, 0.01).name("Roughness").onChange(rebuild);
  noiseFolder.add(params, "seed", 0, 100, 1).name("Seed").onChange(rebuild);
  noiseFolder.open();

  const meshFolder = gui.addFolder("Mesh");
  meshFolder
    .addColor(params, "color")
    .name("Color")
    .onChange((value: string) => boulder.material.color.set(value));
  meshFolder
    .add(params, "flatShading")
    .name("Flat Shading")
    .onChange((value: boolean) => {
      boulder.material.flatShading = value;
      boulder.material.needsUpdate = true;
    });

  return () => {
    gui.destroy();
    boulder.geometry.dispose();
    boulder.material.dispose();
    floor.dispose();
    dispose();
  };
}
