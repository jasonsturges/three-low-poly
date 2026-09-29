import GUI from "lil-gui";
import { DirectionalLight, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry } from "three";
import { createPlaidTexture, type PlaidStripe, type PlaidWeave } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Plaid",
  description: "A woven plaid as a DataTexture — a sett of thread counts, interlaced as twill, plain weave, or print.",
};

// Thread colors, named loosely after tartan shorthand (R red, K black, B navy, G green, ...).
const R = 0xb01c24;
const K = 0x151515;
const B = 0x1c2a4a;
const G = 0x1d4a2e;
const Y = 0xe6b422;
const W = 0xefe9dc;
const A = 0x6fa3d6;

const stripes = (...pairs: [number, number][]): PlaidStripe[] => pairs.map(([color, count]) => ({ color, count }));

// Illustrative setts in the style of each cloth, not registered threadcounts.
const presets: Record<string, { sett: PlaidStripe[]; weft?: PlaidStripe[]; symmetric: boolean; weave: PlaidWeave }> = {
  "Buffalo Check": { sett: stripes([R, 8], [K, 8]), symmetric: true, weave: "twill" },
  // Not a separate pattern: a 4-and-4 check in 2/2 twill *is* houndstooth.
  Houndstooth: { sett: stripes([K, 4], [W, 4]), symmetric: true, weave: "twill" },
  Gingham: { sett: stripes([W, 4], [R, 4]), symmetric: true, weave: "plain" },
  "Dark Tartan": {
    sett: stripes([B, 22], [K, 2], [B, 2], [K, 2], [B, 2], [K, 16], [G, 16], [K, 2]),
    symmetric: true,
    weave: "twill",
  },
  "Red Tartan": {
    sett: stripes([R, 32], [B, 10], [K, 4], [Y, 2], [K, 4], [W, 2], [K, 4], [G, 12], [R, 6], [K, 2], [W, 2]),
    symmetric: true,
    weave: "twill",
  },
  Madras: {
    sett: stripes([Y, 12], [R, 6], [A, 10], [W, 2], [G, 8]),
    weft: stripes([A, 8], [Y, 10], [R, 4], [W, 3], [G, 10]),
    symmetric: false,
    weave: "plain",
  },
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [4, 3.5, 6] });

  // createScene's default lights are soft; a brighter key lets the cloth colors read.
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 7, 4);
  scene.add(key);

  const params = {
    preset: "Red Tartan",
    weave: "twill" as PlaidWeave,
    symmetric: true,
    threadSize: 1,
    repeat: 3,
  };

  const material = new MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const plane = new Mesh(new PlaneGeometry(10, 10), material);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);
  const sphere = new Mesh(new SphereGeometry(1.4, 48, 48), material);
  sphere.position.y = 1.4;
  sphere.castShadow = true;
  scene.add(sphere);

  const rebuild = () => {
    const preset = presets[params.preset]!;
    material.map?.dispose();
    const texture = createPlaidTexture({
      sett: preset.sett,
      weft: preset.weft,
      symmetric: params.symmetric,
      weave: params.weave,
      threadSize: params.threadSize,
    });
    texture.repeat.set(params.repeat, params.repeat);
    material.map = texture;
    material.needsUpdate = true;
  };

  // A preset carries its own weave and symmetry; picking one resets both before rebuilding.
  const applyPreset = () => {
    const preset = presets[params.preset]!;
    params.weave = preset.weave;
    params.symmetric = preset.symmetric;
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
    rebuild();
  };

  const gui = new GUI();
  gui.title("Plaid");
  gui.add(params, "preset", Object.keys(presets)).name("Preset").onChange(applyPreset);
  gui.add(params, "weave", ["twill", "plain", "print"]).name("Weave").onChange(rebuild);
  gui.add(params, "symmetric").name("Symmetric Sett").onChange(rebuild);
  gui.add(params, "threadSize", 1, 8, 1).name("Thread Texels").onChange(rebuild);
  gui.add(params, "repeat", 1, 16, 1).name("Tile Repeat").onChange(rebuild);
  applyPreset();

  return () => {
    gui.destroy();
    plane.geometry.dispose();
    sphere.geometry.dispose();
    material.map?.dispose();
    material.dispose();
    dispose();
  };
}
