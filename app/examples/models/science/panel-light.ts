import GUI from "lil-gui";
import { Panel, PanelLight } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Panel Light" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    color: 0xffc7c7,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
  };

  const panel = new Panel();
  scene.add(panel);

  const panelLight = new PanelLight(params);
  panelLight.position.set(0, 0, 0.1);
  scene.add(panelLight);

  const update = () => {
    panelLight.material.color.set(params.color);
    panelLight.material.emissive.set(params.emissive);
    panelLight.material.emissiveIntensity = params.emissiveIntensity;
  };

  const gui = new GUI();
  gui.addColor(params, "color").name("Color").onChange(update);
  gui.addColor(params, "emissive").name("Emissive").onChange(update);
  gui.add(params, "emissiveIntensity", 0, 1, 0.001).name("Emissive Intensity").onChange(update);

  return () => {
    gui.destroy();
    panel.geometry.dispose();
    panel.material.dispose();
    panelLight.geometry.dispose();
    panelLight.material.dispose();
    dispose();
  };
}