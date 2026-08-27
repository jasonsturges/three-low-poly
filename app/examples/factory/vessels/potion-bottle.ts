import GUI from "lil-gui";
import { Mesh } from "three";
import { PotionBottle, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Potion Bottle" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [3.5, 2.5, 5] });

  const params = {
    radius: 1,
    neckRadius: 0.4,
    height: 2.6,
    radialSegments: 20,
    corkDepth: 0.6,
    corkUpper: 0,
    corkLower: 0.7,
    fill: 0.5,
    color: 0xc23bd6,
    glow: 0.6,
  };

  const build = () =>
    new PotionBottle({
      bottle: {
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

  const disposeAssembly = (group: PotionBottle) => {
    group.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  };

  let bottle = build();
  scene.add(bottle);
  centerObject(bottle);

  const rebuild = () => {
    scene.remove(bottle);
    disposeAssembly(bottle);
    bottle = build();
    scene.add(bottle);
    centerObject(bottle);
  };

  const gui = new GUI();
  gui.title("Potion Bottle");

  const bottleFolder = gui.addFolder("Bottle");
  bottleFolder.add(params, "radius", 0.4, 2, 0.01).name("Radius").onChange(rebuild);
  bottleFolder.add(params, "neckRadius", 0.15, 0.9, 0.01).name("Neck Radius").onChange(rebuild);
  bottleFolder.add(params, "height", 1.5, 4.5, 0.05).name("Height").onChange(rebuild);
  bottleFolder.add(params, "radialSegments", 3, 48, 1).name("Radial Segments").onChange(rebuild);
  bottleFolder.open();

  const cork = gui.addFolder("Cork");
  cork.add(params, "corkDepth", 0, 1, 0.01).name("Depth").onChange(rebuild);
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
    scene.remove(bottle);
    disposeAssembly(bottle);
    dispose();
  };
}
