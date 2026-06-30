import GUI from "lil-gui";
import { Lantern } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Lantern" };

function disposeMaterials(materials: Lantern["material"]) {
  materials.forEach((material) => material.dispose());
}

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, {
    background: 0xb8bcc4,
    cameraPosition: [2, 1.2, 2.5],
  });

  const params = {
    baseWidth: 0.5,
    bodyHeight: 1.3,
    baseHeight: 0.2,
    roofHeight: 0.5,
    glassRadiusScale: 0.9,
    innerScale: 0.96,
    handleRadius: 0.4,
    handleLift: 0.35,
    segments: 8,
    color: "#8b4513",
    lampColor: "#ffd700",
    lampEmissiveIntensity: 1.2,
    lampOpacity: 0.75,
  };

  const makeLantern = () =>
    new Lantern({
      baseWidth: params.baseWidth,
      bodyHeight: params.bodyHeight,
      baseHeight: params.baseHeight,
      roofHeight: params.roofHeight,
      glassRadiusScale: params.glassRadiusScale,
      innerScale: params.innerScale,
      handleRadius: params.handleRadius,
      handleLift: params.handleLift,
      segments: params.segments,
      color: params.color,
      lampColor: params.lampColor,
      lampEmissiveIntensity: params.lampEmissiveIntensity,
      lampOpacity: params.lampOpacity,
    });

  let lantern = makeLantern();
  scene.add(lantern);

  const rebuild = () => {
    scene.remove(lantern);
    lantern.geometry.dispose();
    disposeMaterials(lantern.material);
    lantern = makeLantern();
    scene.add(lantern);
  };

  const gui = new GUI();
  gui.title("Lantern");

  const frameFolder = gui.addFolder("Frame");
  frameFolder.add(params, "baseWidth", 0.2, 1.2).name("Base Width").step(0.05).onChange(rebuild);
  frameFolder.add(params, "bodyHeight", 0.4, 2.5).name("Body Height").step(0.05).onChange(rebuild);
  frameFolder.add(params, "baseHeight", 0.05, 0.5).name("Base Height").step(0.01).onChange(rebuild);
  frameFolder.add(params, "roofHeight", 0.1, 1).name("Roof Height").step(0.05).onChange(rebuild);
  frameFolder.add(params, "glassRadiusScale", 0.5, 1).name("Glass Radius").step(0.05).onChange(rebuild);
  frameFolder.add(params, "innerScale", 0.8, 1).name("Glass Inset").step(0.01).onChange(rebuild);
  frameFolder.add(params, "handleRadius", 0.15, 0.8).name("Handle Radius").step(0.05).onChange(rebuild);
  frameFolder.add(params, "handleLift", 0.1, 0.8).name("Handle Lift").step(0.05).onChange(rebuild);
  frameFolder.add(params, "segments", 3, 32, 1).name("Segments").onChange(rebuild);
  frameFolder.open();

  const lampFolder = gui.addFolder("Lamp");
  lampFolder.addColor(params, "lampColor")
    .name("Color")
    .onChange(() => {
      const lamp = lantern.material[1];
      lamp.color.set(params.lampColor);
      lamp.emissive.set(params.lampColor);
    });
  lampFolder.add(params, "lampEmissiveIntensity", 0, 3)
    .name("Emissive")
    .step(0.05)
    .onChange(() => {
      lantern.material[1].emissiveIntensity = params.lampEmissiveIntensity;
    });
  lampFolder.add(params, "lampOpacity", 0.2, 1)
    .name("Opacity")
    .step(0.01)
    .onChange(() => {
      const lamp = lantern.material[1];
      lamp.opacity = params.lampOpacity;
      lamp.transparent = params.lampOpacity < 1;
      lamp.needsUpdate = true;
    });
  lampFolder.open();

  gui.addColor(params, "color")
    .name("Frame")
    .onChange(() => {
      lantern.material[0].color.set(params.color);
    });

  return () => {
    gui.destroy();
    scene.remove(lantern);
    lantern.geometry.dispose();
    disposeMaterials(lantern.material);
    dispose();
  };
}