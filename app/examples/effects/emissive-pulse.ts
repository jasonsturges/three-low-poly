import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { EmissivePulseEffect, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Emissive Pulse",
  description:
    "Primitive LED pulse — attach to any emissive material, tune color and speed. " +
    "No geometry of its own; pair it with any mesh you like.",
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

  // The effect has no geometry of its own, so the mesh is just a mesh — an LED is a small sphere.
  const led = new Mesh(
    new SphereGeometry(0.15, 8, 8),
    new MeshStandardMaterial({ color: params.color, emissive: params.emissive }),
  );
  scene.add(led);
  centerObject(led);

  const pulse = new EmissivePulseEffect({
    material: led.material,
    speed: params.speed,
    maxIntensity: params.maxIntensity,
    minIntensity: params.minIntensity,
  });

  onFrame((dt) => pulse.update(dt));

  const sync = () => {
    led.material.color.set(params.color);
    led.material.emissive.set(params.emissive);
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
    led.geometry.dispose();
    led.material.dispose();
    dispose();
  };
}