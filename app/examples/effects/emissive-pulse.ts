import GUI from "lil-gui";
import { EmissivePulseEffect, PanelLight, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Emissive Pulse",
  description:
    "Primitive LED pulse — attach to any emissive material, tune color and speed. " +
    "No geometry of its own; pair with PanelLight or your own mesh.",
};

export default function (container: HTMLElement) {
  const { scene, onFrame, dispose } = createScene(container, {
    background: 0x0a0a0c,
  });

  const params = {
    color: 0xffc7c7,
    emissive: 0xff0000,
    speed: 2,
    maxIntensity: 0.8,
    minIntensity: 0.2,
  };

  const panelLight = new PanelLight({
    color: params.color,
    emissive: params.emissive,
  });
  scene.add(panelLight);
  centerObject(panelLight);

  const pulse = new EmissivePulseEffect({
    material: panelLight.material,
    speed: params.speed,
    maxIntensity: params.maxIntensity,
    minIntensity: params.minIntensity,
  });

  onFrame((dt) => pulse.update(dt));

  const sync = () => {
    panelLight.material.color.set(params.color);
    panelLight.material.emissive.set(params.emissive);
    pulse.speed = params.speed;
    pulse.maxIntensity = params.maxIntensity;
    pulse.minIntensity = params.minIntensity;
  };

  const gui = new GUI();
  gui.title("Emissive Pulse");
  gui.addColor(params, "color").name("Color").onChange(sync);
  gui.addColor(params, "emissive").name("Emissive").onChange(sync);
  gui.add(params, "speed", 0.2, 8, 0.01).name("Speed").onChange(sync);
  gui.add(params, "maxIntensity", 0, 3, 0.01).name("Max Intensity").onChange(sync);
  gui.add(params, "minIntensity", 0, 1, 0.01).name("Min Intensity").onChange(sync);

  return () => {
    gui.destroy();
    panelLight.geometry.dispose();
    panelLight.material.dispose();
    dispose();
  };
}