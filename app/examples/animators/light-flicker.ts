import { Mesh, MeshStandardMaterial, PlaneGeometry, PointLight, PointLightHelper } from "three";
import GUI from "lil-gui";
import { Candle, LightFlickerAnimation } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Light Flicker" };

export default function (container: HTMLElement) {
  const { scene, onFrame, dispose } = createScene(container, { cameraPosition: [0, 2, 4] });

  const animations: LightFlickerAnimation[] = [];
  const candles: Candle[] = [];
  const lights: PointLight[] = [];
  const helpers: PointLightHelper[] = [];

  for (let i = 1; i <= 10; i++) {
    const angle = ((i - 1) / 10) * Math.PI * 2;

    const candle = new Candle({
      height: i * 0.1,
      flameHeight: 0.25,
    });
    candle.position.set(Math.cos(angle) * 2.5, 0, Math.sin(angle) * 2.5);
    candle.castShadow = true;
    scene.add(candle);
    candles.push(candle);

    const candleLight = new PointLight(0xffa500, 1, 5);
    candleLight.position.set(Math.cos(angle) * 2.5, i * 0.1 + 0.125, Math.sin(angle) * 2.5);
    candleLight.castShadow = true;
    scene.add(candleLight);
    lights.push(candleLight);

    const lightAnimation = new LightFlickerAnimation({
      light: candleLight,
      x: Math.cos(angle) * 2.5,
      y: i * 0.1 + 0.125,
      z: Math.sin(angle) * 2.5,
    });
    animations.push(lightAnimation);

    const helper = new PointLightHelper(candleLight, 0.1);
    helper.visible = false;
    scene.add(helper);
    helpers.push(helper);
  }

  onFrame(() => {
    for (const animation of animations) animation.update();
  });

  const planeGeometry = new PlaneGeometry(10, 10);
  const planeMaterial = new MeshStandardMaterial({ color: 0x333333 });
  const plane = new Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  const params = {
    maxIntensity: 1.2,
    minIntensity: 0.8,
    jitterX: 0.02,
    jitterY: 0.0,
    jitterZ: 0.02,
    showHelpers: false,
  };

  const update = () => {
    for (const animation of animations) {
      animation.maxIntensity = params.maxIntensity;
      animation.minIntensity = params.minIntensity;
      animation.jitterX = params.jitterX;
      animation.jitterY = params.jitterY;
      animation.jitterZ = params.jitterZ;
    }
    for (const helper of helpers) {
      helper.visible = params.showHelpers;
    }
  };

  const gui = new GUI();
  gui.title("Light Flicker Animator");
  gui.add(params, "maxIntensity", 0, 2, 0.001).name("Max Intensity").onChange(update);
  gui.add(params, "minIntensity", 0, 2, 0.001).name("Min Intensity").onChange(update);
  gui.add(params, "jitterX", 0, 0.25, 0.001).name("Jitter X").onChange(update);
  gui.add(params, "jitterY", 0, 0.25, 0.001).name("Jitter Y").onChange(update);
  gui.add(params, "jitterZ", 0, 0.25, 0.001).name("Jitter Z").onChange(update);
  gui.add(params, "showHelpers").name("Show Helpers").onChange(update);

  return () => {
    gui.destroy();
    for (const candle of candles) {
      candle.geometry.dispose();
      candle.material.forEach((m) => m.dispose());
    }
    planeGeometry.dispose();
    planeMaterial.dispose();
    dispose();
  };
}