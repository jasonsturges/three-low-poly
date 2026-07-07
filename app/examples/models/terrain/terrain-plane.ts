import GUI from "lil-gui";
import { TerrainPlane, TerrainPlaneGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Terrain Plane",
  description:
    "Rectangular heightfield displaced by the same coherent fbm as the terrain mound — " +
    "baked into real vertices, no torn faces. Tileable, or seat the edges flat with Edge Falloff.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [12, 9, 14] });

  const params = {
    width: 16,
    depth: 16,
    widthSegments: 48,
    depthSegments: 48,
    noiseHeight: 0.8,
    noiseScale: 0.35,
    octaves: 4,
    persistence: 0.5,
    edgeFalloff: 0,
    seed: 1,
    color: "#3a5a3a",
    flatShading: true,
  };

  const terrain = new TerrainPlane(params);
  scene.add(terrain);

  const rebuild = () => {
    terrain.geometry.dispose();
    terrain.geometry = new TerrainPlaneGeometry(params);
  };

  const gui = new GUI();
  gui.title("Terrain Plane");

  const shapeFolder = gui.addFolder("Footprint");
  shapeFolder.add(params, "width", 4, 40, 0.5).name("Width").onChange(rebuild);
  shapeFolder.add(params, "depth", 4, 40, 0.5).name("Depth").onChange(rebuild);
  shapeFolder.add(params, "edgeFalloff", 0, 1, 0.01).name("Edge Falloff").onChange(rebuild);
  shapeFolder.open();

  const noiseFolder = gui.addFolder("Terrain Noise");
  noiseFolder.add(params, "noiseHeight", 0, 3, 0.02).name("Relief").onChange(rebuild);
  noiseFolder.add(params, "noiseScale", 0.05, 1.2, 0.01).name("Scale").onChange(rebuild);
  noiseFolder.add(params, "octaves", 1, 6, 1).name("Octaves").onChange(rebuild);
  noiseFolder.add(params, "persistence", 0.1, 0.9, 0.01).name("Roughness").onChange(rebuild);
  noiseFolder.add(params, "seed", 0, 100, 1).name("Seed").onChange(rebuild);
  noiseFolder.open();

  const meshFolder = gui.addFolder("Mesh");
  meshFolder.add(params, "widthSegments", 4, 128, 1).name("Width Segments").onChange(rebuild);
  meshFolder.add(params, "depthSegments", 4, 128, 1).name("Depth Segments").onChange(rebuild);
  meshFolder
    .addColor(params, "color")
    .name("Color")
    .onChange((value: string) => terrain.material.color.set(value));
  meshFolder
    .add(params, "flatShading")
    .name("Flat Shading")
    .onChange((value: boolean) => {
      terrain.material.flatShading = value;
      terrain.material.needsUpdate = true;
    });

  return () => {
    gui.destroy();
    terrain.geometry.dispose();
    terrain.material.dispose();
    dispose();
  };
}
