import { Clock } from "three";
import GUI from "lil-gui";
import { EmissivePulseAnimation, PanelLight, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Emissive Pulse" };

export default function (container: HTMLElement) {
  const { scene, onFrame, dispose } = createScene(container);

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

  const pulseAnimation = new EmissivePulseAnimation({
    material: panelLight.material,
    speed: params.speed,
    maxIntensity: params.maxIntensity,
    minIntensity: params.minIntensity,
  });

  const clock = new Clock();
  onFrame(() => pulseAnimation.update(clock.getElapsedTime()));

  const update = () => {
    panelLight.material.color.set(params.color);
    panelLight.material.emissive.set(params.emissive);
    pulseAnimation.speed = params.speed;
    pulseAnimation.maxIntensity = params.maxIntensity;
    pulseAnimation.minIntensity = params.minIntensity;
  };

  const gui = new GUI();
  gui.title("Emissive Pulse Effect");
  gui.addColor(params, "color").name("Color").onChange(update);
  gui.addColor(params, "emissive").name("Emissive").onChange(update);
  gui.add(params, "speed", 1, 10, 0.01).name("Speed").onChange(update);
  gui.add(params, "maxIntensity", 0, 1, 0.001).name("Max Intensity").onChange(update);
  gui.add(params, "minIntensity", 0, 1, 0.001).name("Min Intensity").onChange(update);

  return () => {
    gui.destroy();
    panelLight.geometry.dispose();
    panelLight.material.dispose();
    dispose();
  };
}