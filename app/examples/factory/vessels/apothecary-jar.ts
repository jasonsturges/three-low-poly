import GUI from "lil-gui";
import { Mesh } from "three";
import { ApothecaryJar, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Apothecary Jar" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [4, 3, 6] });

  const params = {
    radius: 1.5,
    neckRadius: 0.6,
    height: 3.5,
    corkDrop: 0.4,
    fill: 0.5,
    color: 0x6ac06a,
    glow: 0.5,
  };

  const build = () =>
    new ApothecaryJar({
      jar: { radius: params.radius, neckRadius: params.neckRadius, height: params.height },
      corkDrop: params.corkDrop,
      fill:
        params.fill > 0
          ? { fill: params.fill, color: params.color, glow: params.glow, opacity: 0.9, inset: 0.06 }
          : undefined,
    });

  const disposeAssembly = (group: ApothecaryJar) => {
    group.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  };

  let jar = build();
  scene.add(jar);
  centerObject(jar);

  const rebuild = () => {
    scene.remove(jar);
    disposeAssembly(jar);
    jar = build();
    scene.add(jar);
    centerObject(jar);
  };

  const gui = new GUI();
  gui.title("Apothecary Jar");

  const jarFolder = gui.addFolder("Jar");
  jarFolder.add(params, "radius", 0.6, 2.5, 0.01).name("Radius").onChange(rebuild);
  jarFolder.add(params, "neckRadius", 0.2, 1.2, 0.01).name("Neck Radius").onChange(rebuild);
  jarFolder.add(params, "height", 2, 6, 0.05).name("Height").onChange(rebuild);
  jarFolder.open();

  // Drag Drop down and the cork sinks into the neck; up and it lifts off the mouth.
  const cork = gui.addFolder("Cork");
  cork.add(params, "corkDrop", 0, 0.9, 0.01).name("Drop").onChange(rebuild);
  cork.open();

  const fill = gui.addFolder("Fill");
  fill.add(params, "fill", 0, 1, 0.01).name("Fill").onChange(rebuild);
  fill.addColor(params, "color").name("Color").onChange(rebuild);
  fill.add(params, "glow", 0, 2, 0.01).name("Glow").onChange(rebuild);
  fill.open();

  return () => {
    gui.destroy();
    scene.remove(jar);
    disposeAssembly(jar);
    dispose();
  };
}
