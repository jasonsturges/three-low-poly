import GUI from "lil-gui";
import { AdditiveBlending, Color, Mesh, MeshBasicMaterial, NormalBlending, PlaneGeometry } from "three";
import { Easing, createRadialGradientTexture, type RadialGradientStop } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Radial Gradient",
  description:
    "Soft radial falloff as a DataTexture, built pixel by pixel in plain JavaScript — no canvas, so " +
    "it works headless, and no shader, so it runs on either renderer. Any number of stops, each with " +
    "its own color and alpha. Additive blending is the glow case; switch to normal, and lighten the " +
    "background, to inspect the raw falloff.",
};

export default function (container: HTMLElement) {
  const { scene, renderer, dispose } = createScene(container, { cameraPosition: [0, 0, 6] });

  // Named so lil-gui can offer them as a dropdown; each brings the ramp's slope to zero at the
  // stops to a different degree, and `linear` is the canvas-gradient baseline that kinks.
  const easings = ["linear", "smoothstep", "sineOut", "quadOut", "cubicOut", "quintOut"] as const;

  const params = {
    size: 128,
    easing: "smoothstep" as (typeof easings)[number],
    additive: true,
    background: "#0b1020",
    coreOffset: 0,
    coreColor: "#d6e2ff",
    coreAlpha: 0.9,
    midOffset: 0.24,
    midColor: "#8baae6",
    midAlpha: 0.35,
    rimOffset: 1,
    rimColor: "#5878be",
    rimAlpha: 0,
  };

  const geometry = new PlaneGeometry(4, 4);
  const material = new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  const card = new Mesh(geometry, material);
  scene.add(card);

  const stops = (): RadialGradientStop[] => [
    { offset: params.coreOffset, color: params.coreColor, alpha: params.coreAlpha },
    { offset: params.midOffset, color: params.midColor, alpha: params.midAlpha },
    { offset: params.rimOffset, color: params.rimColor, alpha: params.rimAlpha },
  ];

  const rebuild = () => {
    material.map?.dispose();
    material.map = createRadialGradientTexture({
      stops: stops(),
      size: params.size,
      easing: Easing[params.easing],
    });
    material.blending = params.additive ? AdditiveBlending : NormalBlending;
    material.needsUpdate = true;
  };
  rebuild();

  const applyBackground = () => {
    scene.background = new Color(params.background);
    renderer.setClearColor(params.background);
  };
  applyBackground();

  const gui = new GUI();
  gui.title("Radial Gradient");
  // Switch to `linear` and a faint ring appears at the rim. That kink is a slope discontinuity, and
  // vision manufactures a band there (Mach banding) even though the pixels are perfectly continuous.
  gui.add(params, "easing", easings).name("Falloff Easing").onChange(rebuild);
  // Resolution barely matters for a smooth ramp — bilinear filtering interpolates between texels.
  // Drop it to 8 or 16 to see what genuine quantization looks like: many rings, evenly spaced.
  gui.add(params, "size", 4, 512, 4).name("Texels").onChange(rebuild);
  gui.add(params, "additive").name("Additive Blend").onChange(rebuild);
  gui.addColor(params, "background").name("Background").onChange(applyBackground);

  const core = gui.addFolder("Core Stop");
  core.add(params, "coreOffset", 0, 1, 0.01).name("Offset").onChange(rebuild);
  core.addColor(params, "coreColor").name("Color").onChange(rebuild);
  core.add(params, "coreAlpha", 0, 1, 0.01).name("Alpha").onChange(rebuild);
  core.open();

  const mid = gui.addFolder("Mid Stop");
  mid.add(params, "midOffset", 0, 1, 0.01).name("Offset").onChange(rebuild);
  mid.addColor(params, "midColor").name("Color").onChange(rebuild);
  mid.add(params, "midAlpha", 0, 1, 0.01).name("Alpha").onChange(rebuild);
  mid.open();

  const rim = gui.addFolder("Rim Stop");
  rim.add(params, "rimOffset", 0, 1, 0.01).name("Offset").onChange(rebuild);
  rim.addColor(params, "rimColor").name("Color").onChange(rebuild);
  rim.add(params, "rimAlpha", 0, 1, 0.01).name("Alpha").onChange(rebuild);
  rim.open();

  return () => {
    gui.destroy();
    scene.background = null;
    geometry.dispose();
    material.map?.dispose();
    material.dispose();
    dispose();
  };
}
