import { DirectionalLight, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import GUI from "lil-gui";
import { LightningAnimation, setRandomInterval } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Lightning" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const geometry = new SphereGeometry(1, 32, 32);
  const material = new MeshStandardMaterial({ color: 0x5555ff });
  const sphere = new Mesh(geometry, material);
  scene.add(sphere);

  const params = {
    minIntensity: 15,
    maxIntensity: 20,
    minDuration: 50,
    maxDuration: 250,
  };

  const lightning = new DirectionalLight(0xffffff, 0);
  scene.add(lightning);
  lightning.position.set(5, 10, -5);

  const lightningAnimation = new LightningAnimation({ light: lightning, ...params });

  const clearRandomInterval = setRandomInterval(() => {
    lightningAnimation.triggerLightning();
  }, 250, 1250);

  const update = () => {
    lightningAnimation.minIntensity = params.minIntensity;
    lightningAnimation.maxIntensity = params.maxIntensity;
    lightningAnimation.minDuration = params.minDuration;
    lightningAnimation.maxDuration = params.maxDuration;
  };

  const gui = new GUI();
  gui.title("Lightning Effect");
  gui.add(params, "minIntensity", 0.1, 50, 0.1).name("Min Intensity").onChange(update);
  gui.add(params, "maxIntensity", 0.1, 50, 0.1).name("Max Intensity").onChange(update);
  gui.add(params, "minDuration", 1, 1000, 1).name("Min Duration").onChange(update);
  gui.add(params, "maxDuration", 1, 1000, 1).name("Max Duration").onChange(update);

  return () => {
    gui.destroy();
    clearRandomInterval();
    geometry.dispose();
    material.dispose();
    dispose();
  };
}