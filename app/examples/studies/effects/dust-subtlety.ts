import type { ExampleMeta, ExampleMount } from "../../../framework/example";
import GUI from "lil-gui";
import { Color, Group, Vector3 } from "three";
import { DustMotesEffect } from "three-low-poly";
import { createTextSprite } from "../../../framework/createTextSprite";
import { GroundGrid } from "three-low-poly";

export const meta: ExampleMeta = {
  title: "Dust Subtlety",
  description:
    "STUDY — why one dust field reads as air and another reads as particles, with the same effect, the " +
    "same count and the same volume on both sides. LEFT is the library default; RIGHT is the Hallway " +
    "tuning. Density is NOT the variable — both fields run about 0.15 motes per cubic unit, and the only " +
    "differences are radius, opacity and the twinkle range. Two thresholds decide the whole read. ONE " +
    "PIXEL: above about 2px a speck resolves as a shape and your eye tracks it as an object; at or under " +
    "1px it can only be fractional coverage of a single pixel, which is a glint. And because coverage " +
    "attenuates brightness, small and soft are ONE dial below that line, not two — the Hallway speck is " +
    "half the default's radius but a quarter of its light before opacity does anything, ending at about " +
    "1/22nd per mote. THE BLOOM THRESHOLD: the tuned field's additive contribution lands just under it, " +
    "so nothing blooms. Drag Opacity up and watch the readout flip — one notch past the threshold and " +
    "every sub-pixel speck detonates into a halo many times its own size. The whole look is stated in " +
    "PIXELS, so it is resolution- and FOV-dependent: dolly out and the field softens on its own.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  MOTE          one speck. An additive sphere, no billboarding — it reads the same from any angle.
//  TWINKLE       the per-mote scale oscillation, `scaleMin → scaleMax`. Not opacity: the speck grows and
//                shrinks, and below a pixel that IS a brightness change, via coverage.
//  COVERAGE      the fraction of a pixel a primitive touches. MSAA resolves it into partial intensity,
//                which is what makes sub-pixel geometry dim rather than aliased.
//  ADDITIVE      the material blends by ADDING to the frame, so a mote's contribution is its color times
//                its opacity — never darker than the background, and it stacks where motes overlap.
//  THRESHOLD     bloom's cut-off luminance. Nothing under it blooms at all. A cliff, not a ramp.

/** Rec. 709 luminance — what a bloom threshold actually tests. */
const luminance = (hex: string): number => {
  const c = new Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
};

interface Tuning {
  radius: number;
  opacity: number;
  scaleMin: number;
  scaleMax: number;
  color: string;
}

/**
 * The three tunings this study exists to hold side by side.
 *
 * `hallway` is the one worth keeping — measured at that scene's camera, its motes span 0.70–1.59px and add
 * ~0.24 luminance against a 0.45 bloom threshold. Every number here is a screen-space consequence, so they
 * only transfer to a scene with a comparable camera distance and FOV; what transfers unconditionally is the
 * METHOD in the readout below.
 */
const TUNINGS: Record<string, Tuning> = {
  // The Hallway. Half the default radius, under half the opacity, and a twinkle whose ceiling sits below
  // the default's floor.
  hallway: { radius: 0.009, opacity: 0.4, scaleMin: 0.24, scaleMax: 0.55, color: "#8a98b8" },
  // The library defaults — correct for a lit shaft you are meant to notice, far too loud for ambient air.
  library: { radius: 0.02, opacity: 0.9, scaleMin: 0.6, scaleMax: 1.2, color: "#aebfe6" },
  // The Cathedral solves the same problem the other way: full-size specks held at almost zero opacity, then
  // flashed to 0.28 by the lightning. A different effect wearing the same class name.
  cathedral: { radius: 0.02, opacity: 0.02, scaleMin: 0.6, scaleMax: 1.2, color: "#4e5673" },
};

const mount: ExampleMount = (container) => {
  const handle = createDustScene(container, {
    background: 0x06080d,
    cameraPosition: [0, 4.5, 13],
    // ON, and this is not decoration: half the finding is WHERE the motes sit relative to the threshold,
    // which is unobservable without a bloom pass. Matched to the Hallway's own settings.
    bloom: { strength: 0.85, radius: 0.55, threshold: 0.45 },
    // Down, because additive specks are judged against the dark they sit in. A lit room hides the effect.
    lightIntensity: 0.35,
  });
  const { scene, camera, renderer, controls, bloomPass, onFrame, dispose } = handle;

  controls.target.set(0, 3.6, 0);
  controls.update();

  const floor = new GroundGrid({ size: 26 });
  scene.add(floor);

  const params = {
    // Shared by BOTH fields, so neither can be the explanation.
    count: 44,
    width: 6,
    height: 8,
    depth: 6,
    separation: 7,

    preset: "hallway",
    ...TUNINGS.hallway!,

    showReference: true,
    bloomThreshold: 0.45,

    // Readout.
    footprint: "",
    light: "",
    blooms: "",
    versus: "",
    density: "",
  };

  const left = new Group();
  const right = new Group();
  scene.add(left, right);

  const label = (text: string, color: string) =>
    createTextSprite(text, { font: "ui-monospace, monospace", weight: "bold", size: 60, scale: 0.1, color });
  const referenceLabel = label("LIBRARY DEFAULT", "#ffc46b");
  const tunedLabel = label("HALLWAY TUNING", "#7fe3a1");
  left.add(referenceLabel);
  right.add(tunedLabel);

  let reference: DustMotesEffect | undefined;
  let tuned: DustMotesEffect | undefined;

  const field = (tuning: Tuning) =>
    new DustMotesEffect({
      count: params.count,
      width: params.width,
      height: params.height,
      depth: params.depth,
      color: tuning.color,
      radius: tuning.radius,
      opacity: tuning.opacity,
      scaleMin: tuning.scaleMin,
      scaleMax: tuning.scaleMax,
    });

  const clear = () => {
    for (const [group, dust] of [
      [left, reference],
      [right, tuned],
    ] as const) {
      if (dust) {
        group.remove(dust);
        dust.dispose();
      }
    }
  };

  const rebuild = () => {
    clear();

    reference = field(TUNINGS.library!);
    tuned = field(params);
    left.add(reference);
    right.add(tuned);

    left.position.x = -params.separation / 2;
    right.position.x = params.separation / 2;
    const top = params.height + 0.7;
    referenceLabel.position.set(0, top, 0);
    tunedLabel.position.set(0, top, 0);
  };
  rebuild();

  /**
   * The measurement, live — because every number in this study is screen-space and therefore changes as
   * you orbit, dolly, or resize the panel.
   *
   * A sphere of radius `r` at distance `d` subtends `2r/d` radians, and the viewport spans
   * `2·tan(fov/2)` radians over `H` device pixels. Device pixels, not CSS pixels: the rasterizer is what
   * decides whether a speck gets a whole pixel or a fraction of one, and it works in the backing store.
   */
  const measure = () => {
    const height = renderer.domElement.height || 1;
    const distance = camera.position.distanceTo(new Vector3(params.separation / 2, params.height / 2, 0));
    const span = 2 * Math.tan(((camera.fov * Math.PI) / 180) / 2);
    const px = (scale: number) => (2 * params.radius * scale * height) / (distance * span);

    const min = px(params.scaleMin);
    const max = px(params.scaleMax);
    // What the mote ADDS to the frame at full coverage. Additive, so it is simply color × opacity.
    const added = params.opacity * luminance(params.color);
    const threshold = bloomPass ? bloomPass.threshold.value : 0;

    // Light per mote ∝ projected AREA × added luminance — the product that actually tracks how loud a
    // field reads, and the reason halving a radius does so much more than halving an opacity.
    const weight = (diameter: number, lum: number) => Math.PI * (diameter / 2) ** 2 * lum;
    const referenceTuning = TUNINGS.library!;
    const referenceMax =
      (2 * referenceTuning.radius * referenceTuning.scaleMax * height) / (distance * span);
    const ratio =
      weight(referenceMax, referenceTuning.opacity * luminance(referenceTuning.color)) /
      Math.max(1e-9, weight(max, added));

    params.footprint = `${min.toFixed(2)} – ${max.toFixed(2)} px · ${max < 1 ? "always sub-pixel" : min < 1 ? "crosses the 1px line" : "resolves as a shape"}`;
    params.light = `adds ${added.toFixed(3)} luminance · threshold ${threshold.toFixed(2)}`;
    params.blooms =
      added > threshold
        ? `YES — over by ${(added - threshold).toFixed(3)}. Every speck halos.`
        : `no — ${(threshold - added).toFixed(3)} of headroom left`;
    params.versus = `1/${ratio.toFixed(1)} the light of a default mote`;
    const volume = params.width * params.height * params.depth;
    params.density = `${(params.count / volume).toFixed(3)} motes/unit³ — IDENTICAL on both sides`;
  };

  onFrame((delta) => {
    reference?.update(delta);
    tuned?.update(delta);
    measure();
  });

  const gui = new GUI();
  gui.title("Dust Subtlety");

  const speck = gui.addFolder("Speck — the tuned field only");
  const specks = [
    speck
      .add(params, "preset", { "Hallway — subtle": "hallway", "Library default": "library", "Cathedral — flashed": "cathedral" })
      .name("Preset")
      .onChange((key: string) => {
        Object.assign(params, TUNINGS[key]!);
        for (const control of specks) control.updateDisplay();
        rebuild();
      }),
    // THE dial. Everything below one pixel is coverage, so this governs brightness as much as size.
    speck.add(params, "radius", 0.004, 0.06, 0.001).name("Radius").onChange(rebuild),
    // Watch "Blooms?" in the readout as this passes ~0.71 at the default color: a cliff, not a ramp.
    speck.add(params, "opacity", 0.02, 1, 0.01).name("Opacity").onChange(rebuild),
    speck.add(params, "scaleMin", 0.1, 1.5, 0.01).name("Twinkle Min").onChange(rebuild),
    speck.add(params, "scaleMax", 0.15, 2.5, 0.01).name("Twinkle Max").onChange(rebuild),
    speck.addColor(params, "color").name("Color").onChange(rebuild),
  ];
  speck.open();

  // Shared by both fields — the controls that CANNOT be the difference between them.
  const shared = gui.addFolder("Both Fields");
  shared.add(params, "count", 6, 400, 1).name("Count").onChange(rebuild);
  shared.add(params, "width", 2, 16, 0.5).name("Width").onChange(rebuild);
  shared.add(params, "height", 2, 16, 0.5).name("Height").onChange(rebuild);
  shared.add(params, "depth", 2, 16, 0.5).name("Depth").onChange(rebuild);
  shared.add(params, "separation", 3, 16, 0.5).name("Separation").onChange(rebuild);

  const post = gui.addFolder("Bloom");
  post
    .add(params, "bloomThreshold", 0, 1.2, 0.01)
    .name("Threshold")
    .onChange((value: number) => {
      if (bloomPass) bloomPass.threshold.value = value;
    });
  post.open();

  const inspect = gui.addFolder("Inspect");
  inspect
    .add(params, "showReference")
    .name("Ground / Grid")
    .onChange((visible: boolean) => {
      floor.visible = visible;
    });

  // Every one of these is a consequence of the camera as much as of the tuning, which is the point.
  const readout = gui.addFolder("Readout");
  readout.add(params, "footprint").name("Mote Ø").listen().disable();
  readout.add(params, "light").name("Additive").listen().disable();
  readout.add(params, "blooms").name("Blooms?").listen().disable();
  readout.add(params, "versus").name("vs. Default").listen().disable();
  readout.add(params, "density").name("Density").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    for (const sprite of [referenceLabel, tunedLabel]) {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    floor.dispose();
    dispose();
  };
};

export default mount;

// Local bloom-enabled harness: bloom is part of this study, not a shared framework requirement.
import {
  AmbientLight,
  Clock,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
} from "three";
import type { ColorRepresentation } from "three";
import { RenderPipeline, WebGPURenderer } from "three/webgpu";
import { pass } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { configureOrbitControls } from "../../../framework/configureOrbitControls";
import { createWebGPURenderer } from "../../../framework/createWebGPURenderer";

interface BloomOptions {
  /** Defaults to `1`. */
  strength?: number;
  /** Defaults to `0.7`. */
  radius?: number;
  /** Defaults to `0.2`. */
  threshold?: number;
}

interface FogOptions {
  /** Defaults to the scene background, or black. */
  color?: ColorRepresentation;
  /** Exponential density. Defaults to `0.035`. */
  density?: number;
}

interface SceneOptions {
  /** Scene background color. Left black if omitted. */
  background?: ColorRepresentation;
  /** Initial camera position. Defaults to `[0, 0, 5]`. */
  cameraPosition?: [number, number, number];
  /**
   * Add a TSL bloom pass, matching how the portfolio scenes render.
   *
   * Off by default — most isolations want to read a model's form, and bloom
   * fights that. Turn it on when the thing being judged is *light*: emissive
   * geometry standing in for real lamps reads as flat grey without it, which
   * makes the entire emissive-plus-bloom strategy invisible.
   */
  bloom?: boolean | BloomOptions;
  /** Exponential fog. Off by default. The cheapest depth cue there is. */
  fog?: boolean | FogOptions;
  /** Ambient/hemisphere/directional intensity scale. Defaults to `1`. */
  lightIntensity?: number;
}

interface SceneHandle {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGPURenderer;
  controls: OrbitControls;
  /** The bloom pass, when `bloom` was requested — its `strength`/`radius`/`threshold` are live uniforms. */
  bloomPass?: ReturnType<typeof bloom>;
  /** The fog, when `fog` was requested. `density` is live. */
  fog?: FogExp2;
  /** Register a per-frame callback; returns an unsubscribe function. */
  onFrame(handler: (delta: number) => void): () => void;
  /** Stop the loop and release the renderer, controls, and resize observer. */
  dispose(): void;
}

/**
 * Thin scene harness for isolating one portfolio prop, model, or effect. It
 * owns the boilerplate that carries no per-example value (renderer, camera,
 * three-light rig, OrbitControls, the render loop, and resize) and sizes itself
 * to its container rather than the window, so it drops straight into the lab's
 * viewer panel. Examples keep ownership of their own objects, GUI, and disposal.
 *
 * WebGPU-backed (`WebGPURenderer`, WebGL2 fallback) to match how the portfolio
 * scenes render. The device initializes asynchronously, so the render loop
 * starts once `renderer.init()` resolves; the mount stays synchronous, so
 * examples are unaffected.
 */
function createDustScene(container: HTMLElement, options: SceneOptions = {}): SceneHandle {
  const scene = new Scene();
  if (options.background !== undefined) scene.background = new Color(options.background);

  let fog: FogExp2 | undefined;
  if (options.fog) {
    const fogOptions = options.fog === true ? {} : options.fog;
    // Defaults to the background, so the horizon dissolves rather than banding
    // against a colour it never reaches.
    const color = fogOptions.color ?? options.background ?? 0x000000;
    fog = new FogExp2(new Color(color).getHex(), fogOptions.density ?? 0.035);
    scene.fog = fog;
  }

  const camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight || 1, 0.001, 1000);
  const [cx, cy, cz] = options.cameraPosition ?? [0, 0, 5];
  camera.position.set(cx, cy, cz);

  const renderer = createWebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000);
  renderer.shadowMap.enabled = true;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const gain = options.lightIntensity ?? 1;
  const ambient = new AmbientLight(0x404040, 0.5 * gain);
  scene.add(ambient);
  const directional = new DirectionalLight(0xffffff, 0.5 * gain);
  directional.position.set(-5, 10, 5);
  directional.castShadow = true;
  // Configure the shadow camera — the Three.js default is a ±5 frustum with no
  // depth bias, which clips shadows on anything larger than a few units and
  // leaves self-shadow acne on big receivers like ground planes.
  directional.shadow.mapSize.set(2048, 2048);
  directional.shadow.camera.near = 0.5;
  directional.shadow.camera.far = 50;
  directional.shadow.camera.left = -15;
  directional.shadow.camera.right = 15;
  directional.shadow.camera.top = 15;
  directional.shadow.camera.bottom = -15;
  directional.shadow.normalBias = 0.03;
  directional.shadow.bias = -0.0004;
  scene.add(directional);
  const hemisphere = new HemisphereLight(0xaaaaaa, 0x000000, 0.5 * gain);
  hemisphere.position.set(0, 10, 0);
  scene.add(hemisphere);

  const controls = new OrbitControls(camera, canvas);
  configureOrbitControls(controls);

  const handlers = new Set<(delta: number) => void>();

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  // Bloom needs a node pipeline rather than a direct render, so the loop below
  // branches on whether one was built. Same graph the portfolio scenes use:
  // the scene pass added to a bloom of itself.
  let pipeline: RenderPipeline | undefined;
  let bloomPass: ReturnType<typeof bloom> | undefined;
  if (options.bloom) {
    const bloomOptions = options.bloom === true ? {} : options.bloom;
    pipeline = new RenderPipeline(renderer);
    const colorNode = pass(scene, camera).getTextureNode();
    bloomPass = bloom(
      colorNode,
      bloomOptions.strength ?? 1,
      bloomOptions.radius ?? 0.7,
      bloomOptions.threshold ?? 0.2,
    );
    pipeline.outputNode = colorNode.add(bloomPass);
  }

  let disposed = false;
  const clock = new Clock();
  const renderFrame = () => {
    const delta = clock.getDelta();
    controls.update();
    handlers.forEach((handler) => handler(delta));
    if (pipeline) pipeline.render();
    else renderer.render(scene, camera);
  };
  // WebGPU needs async device init before the first render; start the loop once
  // it resolves (and skip it if the scene was disposed while initializing).
  renderer.init().then(() => {
    if (!disposed) renderer.setAnimationLoop(renderFrame);
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    bloomPass,
    fog,
    onFrame(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      pipeline?.dispose();
      renderer.dispose();
      canvas.remove();
      handlers.clear();
    },
  };
}
