import GUI from "lil-gui";
import { StarField, StarFieldOrientation, TerrainMound } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Star Field",
  description:
    "Procedural starry night — instanced starbursts in one draw call. `points` is screen-aligned and " +
    "sized in pixels; `radial` is real 3D geometry sized in angular extents, and runs on either " +
    "renderer. The shell pins itself to the camera, so orbit and dolly as far as you like.",
};

export default function (container: HTMLElement) {
  const { scene, controls, onFrame, dispose } = createScene(container, {
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
    orientation: "points" as StarFieldOrientation,
    count: 2500,
    radius: 480,
    sizeMin: 0.008,
    sizeMax: 0.025,
    pixelSizeMin: 4,
    pixelSizeMax: 14,
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
    new StarField({
      orientation: params.orientation,
      count: params.count,
      radius: params.radius,
      sizeMin: params.sizeMin,
      sizeMax: params.sizeMax,
      pixelSizeMin: params.pixelSizeMin,
      pixelSizeMax: params.pixelSizeMax,
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
  scene.add(stars);

  const rebuild = () => {
    scene.remove(stars);
    stars.dispose();
    stars = createStars();
    scene.add(stars);
  };

  // The shell pins itself to the viewer, so nothing here places it. Twinkle is the only
  // per-frame work.
  onFrame(() => {
    if (params.twinkle) stars.update(performance.now() * 0.001);
  });

  const gui = new GUI();
  gui.title("Star Field");
  gui
    .add(params, "orientation", ["points", "radial"])
    .name("Orientation")
    .onChange(() => {
      rebuild();
      syncControlVisibility();
    });
  gui.add(params, "count", 100, 8000, 100).name("Count").onChange(rebuild);
  gui.add(params, "radius", 100, 900, 10).name("Radius").onChange(rebuild);
  const angularMin = gui.add(params, "sizeMin", 0.002, 0.08, 0.001).name("Angular Min").onChange(rebuild);
  const angularMax = gui.add(params, "sizeMax", 0.002, 0.08, 0.001).name("Angular Max").onChange(rebuild);
  // EXPERIMENTAL (points): size is a pixel radius, so shell depth no longer affects apparent size.
  const pixelMin = gui.add(params, "pixelSizeMin", 1, 40, 0.5).name("Pixel Min").onChange(rebuild);
  const pixelMax = gui.add(params, "pixelSizeMax", 1, 40, 0.5).name("Pixel Max").onChange(rebuild);
  gui.add(params, "rotation", 0, Math.PI * 2, 0.01).name("Rotation").onChange(rebuild);
  gui.add(params, "rotationJitter", 0, Math.PI * 2, 0.01).name("Rotation Jitter").onChange(rebuild);
  gui.add(params, "twinkle").name("Twinkle");

  const burstFolder = gui.addFolder("Burst Shape");
  burstFolder.add(params, "burstPoints", 2, 16, 1).name("Points").onChange(rebuild);
  burstFolder.add(params, "burstInner", 0.1, 1.5, 0.05).name("Inner Radius").onChange(rebuild);
  burstFolder.add(params, "burstOuter", 0.5, 3, 0.05).name("Outer Radius").onChange(rebuild);
  const depthControl = burstFolder.add(params, "burstDepth", 0, 0.5, 0.01).name("Depth").onChange(rebuild);
  burstFolder.open();

  // Billboards draw the XY profile only, so extrusion depth has nothing to act on. And the two
  // sizing schemes are mutually exclusive: angular is world-unit, points is screen-pixel.
  // The size unit follows the orientation: screen-aligned stars are sized in pixels, real geometry
  // in angular extents. Depth only means something when the star isn't flattened to its XY profile.
  const syncControlVisibility = () => {
    const isPoints = params.orientation === "points";
    depthControl.show(!isPoints);
    angularMin.show(!isPoints);
    angularMax.show(!isPoints);
    pixelMin.show(isPoints);
    pixelMax.show(isPoints);
  };
  syncControlVisibility();

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
