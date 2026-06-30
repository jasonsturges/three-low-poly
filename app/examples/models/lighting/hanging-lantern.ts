import GUI from "lil-gui";
import { HangingLantern } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Hanging Lantern" };

function disposeMaterials(materials: HangingLantern["material"]) {
  materials.forEach((material) => material.dispose());
}

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, {
    background: 0xb8bcc4,
    cameraPosition: [2.5, 1, 4],
  });

  const params = {
    drop: 3,
    chainWidth: 0.05,
    cageRadius: 0.42,
    cageStretch: 1.4,
    cageGap: 0,
    cageBarWidth: 0.03,
    innerScale: 0.96,
    color: "#171a1f",
    lampColor: "#ffb45a",
    lampEmissiveIntensity: 1.4,
    lampOpacity: 0.88,
  };

  const makeLantern = () =>
    new HangingLantern({
      drop: params.drop,
      chainWidth: params.chainWidth,
      cageRadius: params.cageRadius,
      cageStretch: params.cageStretch,
      cageGap: params.cageGap,
      cageBarWidth: params.cageBarWidth,
      innerScale: params.innerScale,
      color: params.color,
      lampColor: params.lampColor,
      lampEmissiveIntensity: params.lampEmissiveIntensity,
      lampOpacity: params.lampOpacity,
    });

  let lantern = makeLantern();
  lantern.position.y = 4;
  scene.add(lantern);

  const rebuild = () => {
    scene.remove(lantern);
    lantern.geometry.dispose();
    disposeMaterials(lantern.material);
    lantern = makeLantern();
    lantern.position.y = 4;
    scene.add(lantern);
  };

  const gui = new GUI();
  gui.title("Hanging Lantern");

  const frameFolder = gui.addFolder("Frame");
  frameFolder.add(params, "drop", 0.5, 6).name("Drop").step(0.1).onChange(rebuild);
  frameFolder.add(params, "chainWidth", 0.02, 0.15).name("Chain Width").step(0.01).onChange(rebuild);
  frameFolder.add(params, "cageRadius", 0.15, 0.8).name("Cage Radius").step(0.01).onChange(rebuild);
  frameFolder.add(params, "cageStretch", 0.8, 2.5).name("Cage Stretch").step(0.05).onChange(rebuild);
  frameFolder.add(params, "cageGap", 0, 0.5).name("Cage Drop").step(0.01).onChange(rebuild);
  frameFolder.add(params, "cageBarWidth", 0.01, 0.08).name("Bar Width").step(0.005).onChange(rebuild);
  frameFolder.add(params, "innerScale", 0.8, 1).name("Lamp Inset").step(0.01).onChange(rebuild);
  frameFolder.open();

  const lampFolder = gui.addFolder("Lamp");
  lampFolder.addColor(params, "lampColor")
    .name("Color")
    .onChange(() => {
      const lamp = lantern.material[2];
      lamp.color.set(params.lampColor);
      lamp.emissive.set(params.lampColor);
    });
  lampFolder.add(params, "lampEmissiveIntensity", 0, 3)
    .name("Emissive")
    .step(0.05)
    .onChange(() => {
      lantern.material[2].emissiveIntensity = params.lampEmissiveIntensity;
    });
  lampFolder.add(params, "lampOpacity", 0.2, 1)
    .name("Opacity")
    .step(0.01)
    .onChange(() => {
      const lamp = lantern.material[2];
      lamp.opacity = params.lampOpacity;
      lamp.transparent = params.lampOpacity < 1;
      lamp.needsUpdate = true;
    });
  lampFolder.open();

  gui.addColor(params, "color")
    .name("Iron")
    .onChange(() => {
      lantern.material[0].color.set(params.color);
      lantern.material[1].color.set(params.color);
    });

  return () => {
    gui.destroy();
    scene.remove(lantern);
    lantern.geometry.dispose();
    disposeMaterials(lantern.material);
    dispose();
  };
}