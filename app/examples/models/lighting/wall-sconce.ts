import GUI from "lil-gui";
import { WallSconce } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wall Sconce" };

function disposeMaterials(materials: WallSconce["material"]) {
  materials.forEach((material) => material.dispose());
}

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, {
    background: 0xb8bcc4,
    cameraPosition: [1.2, 0.2, 1.5],
  });

  const params = {
    bodyOffsetX: 0.06,
    chimneyHeight: 0.3,
    innerScale: 0.96,
    color: "#1c1e24",
    lampColor: "#e8a058",
    lampEmissiveIntensity: 1.4,
    lampOpacity: 0.88,
  };

  const makeSconce = () =>
    new WallSconce({
      bodyOffsetX: params.bodyOffsetX,
      chimneyHeight: params.chimneyHeight,
      innerScale: params.innerScale,
      color: params.color,
      lampColor: params.lampColor,
      lampEmissiveIntensity: params.lampEmissiveIntensity,
      lampOpacity: params.lampOpacity,
    });

  let sconce = makeSconce();
  sconce.position.x = -0.5;
  scene.add(sconce);

  const rebuild = () => {
    scene.remove(sconce);
    sconce.geometry.dispose();
    disposeMaterials(sconce.material);
    sconce = makeSconce();
    sconce.position.x = -0.5;
    scene.add(sconce);
  };

  const gui = new GUI();
  gui.title("Wall Sconce");

  const frameFolder = gui.addFolder("Frame");
  frameFolder.add(params, "bodyOffsetX", 0, 0.2).name("Body Offset X").step(0.01).onChange(rebuild);
  frameFolder.add(params, "chimneyHeight", 0.15, 0.5).name("Chimney Height").step(0.01).onChange(rebuild);
  frameFolder.add(params, "innerScale", 0.8, 1).name("Glass Inset").step(0.01).onChange(rebuild);
  frameFolder.open();

  const lampFolder = gui.addFolder("Lamp");
  lampFolder.addColor(params, "lampColor")
    .name("Color")
    .onChange(() => {
      const lamp = sconce.material[2];
      lamp.color.set(params.lampColor);
      lamp.emissive.set(params.lampColor);
    });
  lampFolder.add(params, "lampEmissiveIntensity", 0, 3)
    .name("Emissive")
    .step(0.05)
    .onChange(() => {
      sconce.material[2].emissiveIntensity = params.lampEmissiveIntensity;
    });
  lampFolder.add(params, "lampOpacity", 0.2, 1)
    .name("Opacity")
    .step(0.01)
    .onChange(() => {
      const lamp = sconce.material[2];
      lamp.opacity = params.lampOpacity;
      lamp.transparent = params.lampOpacity < 1;
      lamp.needsUpdate = true;
    });
  lampFolder.open();

  gui.addColor(params, "color")
    .name("Iron")
    .onChange(() => {
      sconce.material[0].color.set(params.color);
      sconce.material[1].color.set(params.color);
    });

  return () => {
    gui.destroy();
    scene.remove(sconce);
    sconce.geometry.dispose();
    disposeMaterials(sconce.material);
    dispose();
  };
}