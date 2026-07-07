import GUI from "lil-gui";
import { Flame, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Flame" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    height: 0.25,
    radius: 0.05,
    segmentsU: 16,
    segmentsV: 16,
    color: "#ffd700",
    emissive: "#ffa500",
    emissiveIntensity: 0.35,
  };

  const makeFlame = () => new Flame(params);

  let flame = makeFlame();
  scene.add(flame);
  centerObject(flame);

  const rebuild = () => {
    scene.remove(flame);
    flame.geometry.dispose();
    flame.material.dispose();
    flame = makeFlame();
    scene.add(flame);
    centerObject(flame);
  };

  const gui = new GUI();
  gui.title("Flame");

  const shapeFolder = gui.addFolder("Shape");
  shapeFolder.add(params, "height", 0.1, 5, 0.01).name("Height").onChange(rebuild);
  shapeFolder.add(params, "radius", 0.01, 0.5, 0.01).name("Radius").onChange(rebuild);
  shapeFolder.add(params, "segmentsU", 3, 32, 1).name("Segments U").onChange(rebuild);
  shapeFolder.add(params, "segmentsV", 3, 32, 1).name("Segments V").onChange(rebuild);
  shapeFolder.open();

  const materialFolder = gui.addFolder("Material");
  materialFolder.addColor(params, "color")
    .name("Color")
    .onChange(() => flame.material.color.set(params.color));
  materialFolder.addColor(params, "emissive")
    .name("Emissive")
    .onChange(() => flame.material.emissive.set(params.emissive));
  materialFolder.add(params, "emissiveIntensity", 0, 2, 0.05)
    .name("Intensity")
    .onChange(() => {
      flame.material.emissiveIntensity = params.emissiveIntensity;
    });
  materialFolder.open();

  return () => {
    gui.destroy();
    scene.remove(flame);
    flame.geometry.dispose();
    flame.material.dispose();
    dispose();
  };
}