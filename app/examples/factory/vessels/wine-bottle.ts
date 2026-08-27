import GUI from "lil-gui";
import { Mesh } from "three";
import { WineBottle } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { gradientBackdrop } from "../../../framework/gradientBackdrop";

export const meta = { title: "Wine Bottle" };

export default function (container: HTMLElement) {
  const handle = createScene(container, { cameraPosition: [3, 2.5, 5] });
  const { scene, dispose } = handle;
  const disposeBackdrop = gradientBackdrop(scene);

  const params = {
    radius: 0.5,
    neckRadius: 0.18,
    height: 3,
    neckHeight: 0.9,
    shoulderHeight: 0.5,
    shoulderSegments: 6,
    radialSegments: 20,
    corkDepth: 1,
    corkUpper: 1.2,
    corkLower: 1.2,
    fill: 0.7,
    color: 0x7a1f2b,
    glow: 0.15,
  };

  const build = () =>
    new WineBottle({
      bottle: {
        radius: params.radius,
        neckRadius: params.neckRadius,
        height: params.height,
        neckHeight: params.neckHeight,
        shoulderHeight: params.shoulderHeight,
        shoulderSegments: params.shoulderSegments,
        radialSegments: params.radialSegments,
      },
      corkDepth: params.corkDepth,
      cork: { upperHeight: params.corkUpper, lowerHeight: params.corkLower },
      fill:
        params.fill > 0
          ? { fill: params.fill, color: params.color, glow: params.glow, opacity: 0.9, inset: 0.05 }
          : undefined,
    });

  const disposeAssembly = (group: WineBottle) => {
    group.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  };

  let wine = build();
  scene.add(wine);
  frameObject(handle, wine);

  const rebuild = () => {
    scene.remove(wine);
    disposeAssembly(wine);
    wine = build();
    scene.add(wine);
    frameObject(handle, wine, { dolly: false });
  };

  const gui = new GUI();
  gui.title("Wine Bottle");

  const bottle = gui.addFolder("Bottle");
  bottle.add(params, "radius", 0.25, 1, 0.01).name("Radius").onChange(rebuild);
  bottle.add(params, "neckRadius", 0.1, 0.4, 0.01).name("Neck Radius").onChange(rebuild);
  bottle.add(params, "height", 2, 5, 0.05).name("Height").onChange(rebuild);
  bottle.add(params, "neckHeight", 0.3, 1.8, 0.05).name("Neck Height").onChange(rebuild);
  bottle.add(params, "shoulderHeight", 0.1, 1.2, 0.05).name("Shoulder Height").onChange(rebuild);
  // 1 = a hard straight shoulder; higher rounds it.
  bottle.add(params, "shoulderSegments", 1, 12, 1).name("Shoulder Segments").onChange(rebuild);
  bottle.add(params, "radialSegments", 3, 48, 1).name("Radial Segments").onChange(rebuild);
  bottle.open();

  const cork = gui.addFolder("Cork");
  cork.add(params, "corkDepth", 0, 1, 0.01).name("Depth").onChange(rebuild);
  cork.add(params, "corkUpper", 0, 1.6, 0.01).name("Upper Height").onChange(rebuild);
  cork.add(params, "corkLower", 0.05, 1.6, 0.01).name("Lower Height").onChange(rebuild);
  cork.open();

  const fill = gui.addFolder("Fill");
  fill.add(params, "fill", 0, 1, 0.01).name("Fill").onChange(rebuild);
  fill.addColor(params, "color").name("Color").onChange(rebuild);
  fill.add(params, "glow", 0, 2, 0.01).name("Glow").onChange(rebuild);
  fill.open();

  return () => {
    gui.destroy();
    scene.remove(wine);
    disposeAssembly(wine);
    disposeBackdrop();
    dispose();
  };
}
