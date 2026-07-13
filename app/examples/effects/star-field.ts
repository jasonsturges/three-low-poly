import GUI from "lil-gui";
import { StarFieldEffect, StarFieldOrientation, TerrainMound } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Star Field",
  description:
    "Procedural starry night — instanced starbursts, screen-aligned (billboard) or facing the " +
    "shell center (radial). Orbit the scene; the star shell follows the camera.",
};

export default function (container: HTMLElement) {
  const { scene, camera, controls, onFrame, dispose } = createScene(container, {
    background: 0x000000,
    cameraPosition: [0, 4, 14],
  });

  controls.target.set(0, 1.5, 0);
  controls.update();

  // A rounded terrain mound as the ground gives the eye a foreground surface to
  // relate the star shell to — dolly in and the sky reads as an enclosing dome.
  const ground = new TerrainMound({ radius: 14, height: 1.6, noiseHeight: 0.7, color: "#243426", seed: 7 });
  scene.add(ground);

  const params = {
    orientation: "billboard" as StarFieldOrientation,
    count: 2500,
    radius: 480,
    sizeMin: 0.008,
    sizeMax: 0.025,
    rotation: 0,
    rotationJitter: 0,
    twinkle: true,
    burstPoints: 4,
    burstInner: 0.6,
    burstOuter: 1.9,
    burstDepth: 0.05,
    showReference: true,
  };

  const createStars = () =>
    new StarFieldEffect({
      orientation: params.orientation,
      count: params.count,
      radius: params.radius,
      sizeMin: params.sizeMin,
      sizeMax: params.sizeMax,
      rotation: params.rotation,
      rotationJitter: params.rotationJitter,
      twinkle: params.twinkle,
      burst: {
        points: params.burstPoints,
        innerRadius: params.burstInner,
        outerRadius: params.burstOuter,
        depth: params.burstDepth,
      },
    });

  let stars = createStars();
  stars.position.copy(camera.position);
  scene.add(stars);

  const rebuild = () => {
    scene.remove(stars);
    stars.dispose();
    stars = createStars();
    stars.position.copy(camera.position);
    scene.add(stars);
  };

  onFrame(() => {
    stars.position.copy(camera.position);
    if (params.twinkle) stars.update(performance.now() * 0.001);
  });

  const gui = new GUI();
  gui.title("Star Field");
  gui
    .add(params, "orientation", ["billboard", "radial"])
    .name("Orientation")
    .onChange(() => {
      rebuild();
      syncDepthVisibility();
    });
  gui.add(params, "count", 100, 8000, 100).name("Count").onChange(rebuild);
  gui.add(params, "radius", 100, 900, 10).name("Radius").onChange(rebuild);
  gui.add(params, "sizeMin", 0.002, 0.08, 0.001).name("Angular Min").onChange(rebuild);
  gui.add(params, "sizeMax", 0.002, 0.08, 0.001).name("Angular Max").onChange(rebuild);
  gui.add(params, "rotation", 0, Math.PI * 2, 0.01).name("Rotation").onChange(rebuild);
  gui.add(params, "rotationJitter", 0, Math.PI * 2, 0.01).name("Rotation Jitter").onChange(rebuild);
  gui.add(params, "twinkle").name("Twinkle");

  const burstFolder = gui.addFolder("Burst Shape");
  burstFolder.add(params, "burstPoints", 2, 16, 1).name("Points").onChange(rebuild);
  burstFolder.add(params, "burstInner", 0.1, 1.5, 0.05).name("Inner Radius").onChange(rebuild);
  burstFolder.add(params, "burstOuter", 0.5, 3, 0.05).name("Outer Radius").onChange(rebuild);
  const depthControl = burstFolder.add(params, "burstDepth", 0, 0.5, 0.01).name("Depth").onChange(rebuild);
  burstFolder.open();

  // Billboards draw the XY profile only, so extrusion depth has nothing to act on.
  const syncDepthVisibility = () => depthControl.show(params.orientation === "radial");
  syncDepthVisibility();

  gui
    .add(params, "showReference")
    .name("Ground")
    .onChange((visible: boolean) => {
      ground.visible = visible;
    });

  return () => {
    gui.destroy();
    scene.remove(stars);
    stars.dispose();
    ground.geometry.dispose();
    ground.material.dispose();
    dispose();
  };
}
