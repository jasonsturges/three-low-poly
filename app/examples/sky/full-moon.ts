import GUI from "lil-gui";
import { FullMoon, StarField, TerrainMound } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Full Moon",
  description:
    "A flat unlit disc wrapped in an additive haze card, placed by compass bearing and elevation the " +
    "way sun and moon positions are actually given. A sky layer, not a skybox, so it stacks with the " +
    "star field instead of repainting the sky. Both pin themselves to the camera, so no amount of " +
    "dollying gets you closer — and the terrain still silhouettes against the disc.",
};

export default function (container: HTMLElement) {
  const { scene, controls, onFrame, dispose } = createScene(container, {
    background: 0x02050c,
    cameraPosition: [0, 6, 20],
  });

  controls.target.set(0, 3, 0);
  controls.update();

  // Ground gives the disc something to rise behind — the moon is depth-tested, so the
  // terrain edge silhouettes against it rather than being painted over.
  const ground = new TerrainMound({ radius: 16, height: 1.8, noiseHeight: 0.8, color: "#1d2320", seed: 11 });
  scene.add(ground);

  // A second, independent sky layer. Nothing here is coordinated with the moon — both simply
  // ride the camera, which is what lets them stack.
  const stars = new StarField({ count: 2200, radius: 480, rotationJitter: 0, twinkle: true });
  scene.add(stars);

  const params = {
    azimuth: 18,
    elevation: 1.15,
    radius: 14,
    distance: 300,
    segments: 64,
    color: "#d8e3ff",
    halo: true,
    haloScale: 6.2,
    haloOpacity: 0.72,
    showStars: true,
    showGround: true,
  };

  const createMoon = () =>
    new FullMoon({
      azimuth: params.azimuth,
      elevation: params.elevation,
      radius: params.radius,
      distance: params.distance,
      segments: params.segments,
      color: params.color,
      halo: params.halo ? { scale: params.haloScale, opacity: params.haloOpacity } : false,
    });

  let moon = createMoon();
  scene.add(moon);

  const rebuild = () => {
    scene.remove(moon);
    moon.dispose();
    moon = createMoon();
    scene.add(moon);
  };

  // No placement call: both sky layers pin themselves to the viewer, so orbit and dolly as far
  // as you like — neither is reachable. This handler exists purely to animate the twinkle.
  onFrame(() => {
    stars.update(performance.now() * 0.001);
  });

  const gui = new GUI();
  gui.title("Moon");
  gui.add(params, "azimuth", 0, 360, 1).name("Azimuth° (N→E)").onChange(rebuild);
  gui.add(params, "elevation", -10, 90, 0.05).name("Elevation°").onChange(rebuild);
  gui.add(params, "radius", 2, 40, 0.5).name("Radius").onChange(rebuild);
  gui.add(params, "distance", 60, 900, 10).name("Distance").onChange(rebuild);
  // Flat disc, so segments are nearly free — the default is smooth on purpose. Drop it low
  // for a deliberately faceted moon, but a chunky one tends to read as broken, not stylized.
  gui.add(params, "segments", 3, 128, 1).name("Segments").onChange(rebuild);
  gui.addColor(params, "color").name("Color").onChange(rebuild);

  const haloFolder = gui.addFolder("Halo");
  haloFolder.add(params, "halo").name("Enabled").onChange(rebuild);
  haloFolder.add(params, "haloScale", 1, 14, 0.1).name("Scale ×Radius").onChange(rebuild);
  haloFolder.add(params, "haloOpacity", 0, 1, 0.01).name("Opacity").onChange(rebuild);
  haloFolder.open();

  const sceneFolder = gui.addFolder("Scene");
  sceneFolder
    .add(params, "showStars")
    .name("Star Field")
    .onChange((visible: boolean) => {
      stars.visible = visible;
    });
  sceneFolder
    .add(params, "showGround")
    .name("Ground")
    .onChange((visible: boolean) => {
      ground.visible = visible;
    });

  return () => {
    gui.destroy();
    scene.remove(moon);
    moon.dispose();
    scene.remove(stars);
    stars.dispose();
    ground.geometry.dispose();
    ground.material.dispose();
    dispose();
  };
}
