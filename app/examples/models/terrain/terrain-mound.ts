import GUI from "lil-gui";
import { TerrainMound, TerrainMoundGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Terrain Mound",
  description:
    "Circular dome broken up with coherent fbm noise baked into real vertices — rolling " +
    "low-poly terrain, not a smooth lens. Rim seats flush on Y=0; no torn faces.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [10, 8, 14] });

  const params = {
    radius: 8,
    height: 1.2,
    radialSegments: 40,
    angularSegments: 64,
    noiseHeight: 0.5,
    noiseScale: 0.35,
    octaves: 4,
    persistence: 0.5,
    rim: 0.82,
    seed: 1,
    color: "#3a5a3a",
    flatShading: true,
  };

  const mound = new TerrainMound(params);
  scene.add(mound);

  const rebuild = () => {
    mound.geometry.dispose();
    mound.geometry = new TerrainMoundGeometry(params);
  };

  const gui = new GUI();
  gui.title("Terrain Mound");

  const shapeFolder = gui.addFolder("Dome");
  shapeFolder.add(params, "radius", 2, 20, 0.1).name("Radius").onChange(rebuild);
  shapeFolder.add(params, "height", 0, 6, 0.05).name("Peak Height").onChange(rebuild);
  shapeFolder.add(params, "rim", 0.4, 0.98, 0.01).name("Rim Fade").onChange(rebuild);
  shapeFolder.open();

  const noiseFolder = gui.addFolder("Terrain Noise");
  noiseFolder.add(params, "noiseHeight", 0, 2, 0.02).name("Relief").onChange(rebuild);
  noiseFolder.add(params, "noiseScale", 0.05, 1.2, 0.01).name("Scale").onChange(rebuild);
  noiseFolder.add(params, "octaves", 1, 6, 1).name("Octaves").onChange(rebuild);
  noiseFolder.add(params, "persistence", 0.1, 0.9, 0.01).name("Roughness").onChange(rebuild);
  noiseFolder.add(params, "seed", 0, 100, 1).name("Seed").onChange(rebuild);
  noiseFolder.open();

  const meshFolder = gui.addFolder("Mesh");
  meshFolder.add(params, "radialSegments", 6, 96, 1).name("Radial Segments").onChange(rebuild);
  meshFolder.add(params, "angularSegments", 8, 128, 1).name("Angular Segments").onChange(rebuild);
  meshFolder
    .addColor(params, "color")
    .name("Color")
    .onChange((value: string) => mound.material.color.set(value));
  meshFolder
    .add(params, "flatShading")
    .name("Flat Shading")
    .onChange((value: boolean) => {
      mound.material.flatShading = value;
      mound.material.needsUpdate = true;
    });

  return () => {
    gui.destroy();
    mound.geometry.dispose();
    mound.material.dispose();
    dispose();
  };
}
