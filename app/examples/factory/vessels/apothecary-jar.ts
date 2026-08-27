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
    radialSegments: 20,
    corkDepth: 0.6,
    corkUpper: 0,
    corkLower: 0.7,
    fill: 0.5,
    color: 0x6ac06a,
    glow: 0.5,
  };

  const build = () =>
    new ApothecaryJar({
      jar: {
        radius: params.radius,
        neckRadius: params.neckRadius,
        height: params.height,
        radialSegments: params.radialSegments,
      },
      corkDepth: params.corkDepth,
      cork: { upperHeight: params.corkUpper, lowerHeight: params.corkLower },
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
  jarFolder.add(params, "radialSegments", 3, 48, 1).name("Radial Segments").onChange(rebuild);
  jarFolder.open();

  // Depth 1 seats the flat top flush with the rim; lower values push the lid up, and it scales to stay sealed.
  const cork = gui.addFolder("Cork");
  cork.add(params, "corkDepth", 0, 1, 0.01).name("Depth").onChange(rebuild);
  // Upper Height rises the cap vertically above the seal (top radius stays equal to the middle).
  cork.add(params, "corkUpper", 0, 0.8, 0.01).name("Upper Height").onChange(rebuild);
  cork.add(params, "corkLower", 0.05, 0.8, 0.01).name("Lower Height").onChange(rebuild);
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
