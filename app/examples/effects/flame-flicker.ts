import { Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, SphereGeometry } from "three";
import GUI from "lil-gui";
import { FlameFlickerEffect, GlowHalo } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Flame Flicker",
  description:
    "Calm sine-based flame pulse — syncs halo, flame core, and optional PointLight. " +
    "Toggle the real light for hero sconce vs halo-only mass candles.",
};

export default function (container: HTMLElement) {
  const { scene, camera, onFrame, dispose } = createScene(container, {
    background: 0x0a0806,
    cameraPosition: [0, 2.2, 5],
  });

  const ground = new Mesh(
    new PlaneGeometry(12, 12),
    new MeshStandardMaterial({ color: 0x1a1410, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const params = {
    color: 0xffaa44,
    haloSize: 1.4,
    haloOpacity: 0.75,
    lightIntensity: 4,
    useRealLight: true,
  };

  const flameMaterial = new MeshBasicMaterial({ color: params.color, toneMapped: false });
  const flame = new Mesh(new SphereGeometry(0.1, 10, 10), flameMaterial);
  flame.position.set(0, 1.1, 0);
  scene.add(flame);

  const halo = new GlowHalo({
    color: params.color,
    size: params.haloSize,
    opacity: params.haloOpacity,
  });
  halo.position.copy(flame.position);
  scene.add(halo);

  const pointLight = new PointLight(params.color, params.lightIntensity, 9, 2);
  pointLight.position.copy(flame.position);
  pointLight.castShadow = true;
  scene.add(pointLight);

  let flicker = new FlameFlickerEffect({
    flame: flameMaterial,
    flameColor: params.color,
    halo,
    haloOpacity: params.haloOpacity,
    light: params.useRealLight ? pointLight : undefined,
    lightIntensity: params.lightIntensity,
  });

  const rebuildFlicker = () => {
    flicker = new FlameFlickerEffect({
      seed: flicker.seed,
      flame: flameMaterial,
      flameColor: params.color,
      halo,
      haloOpacity: params.haloOpacity,
      light: params.useRealLight ? pointLight : undefined,
      lightIntensity: params.lightIntensity,
    });
  };

  onFrame((dt) => {
    flicker.update(dt);
    flicker.faceCamera(camera.position);
  });

  const sync = () => {
    flameMaterial.color.set(params.color);
    halo.setColor(params.color);
    pointLight.color.set(params.color);
    pointLight.visible = params.useRealLight;
    rebuildFlicker();
  };

  const gui = new GUI();
  gui.title("Flame Flicker");
  gui.addColor(params, "color").name("Color").onChange(sync);
  gui.add(params, "haloSize", 0.6, 2.5, 0.05).name("Halo Size").onChange(() => {
    halo.scale.setScalar(params.haloSize / 1.4);
  });
  gui.add(params, "haloOpacity", 0.1, 1, 0.01).name("Halo Opacity").onChange(() => {
    flicker.haloOpacity = params.haloOpacity;
  });
  gui.add(params, "lightIntensity", 0, 12, 0.1).name("Light Intensity").onChange(() => {
    flicker.lightIntensity = params.lightIntensity;
  });
  gui.add(params, "useRealLight").name("Use PointLight").onChange(sync);

  return () => {
    gui.destroy();
    flame.geometry.dispose();
    flameMaterial.dispose();
    halo.dispose();
    ground.geometry.dispose();
    (ground.material as MeshStandardMaterial).dispose();
    dispose();
  };
}