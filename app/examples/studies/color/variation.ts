import GUI from "lil-gui";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  type Sprite,
} from "three";
import { createRandom, hslToRgb } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { clearDefaultLights } from "../../../framework/clearDefaultLights";
import { createTextSprite } from "../../../framework/createTextSprite";

export const meta = {
  title: "Color Variation",
  description:
    "STUDY — compare color recipes with the same seeded samples. Each row repeats its colors as unlit swatches and shaded boards. Start with Timber, Pumpkin, or Stone; explore channel bounds, endpoints, palette weights, and sampling bias. The hardwood baseline uses Three's working-linear HSL; the controlled rows use sRGB HSL. These are different coordinate systems, neither perceptually uniform. Endpoint interpolation is linear RGB. Analogous is a seeded adaptation of the legacy helper's ±30° / 60–80% / 50–70% recipe, with corrected hue wrapping and explicit sRGB input. Experimental recipes stay in this study.",
};

const presets = {
  Timber: { base: "#6b4b2c", low: "#493729", high: "#93714f", palette: ["#513d2c", "#634932", "#765638", "#896847"] },
  Pumpkin: { base: "#c87524", low: "#79512b", high: "#e4a240", palette: ["#98602c", "#ba6b23", "#d5862b", "#d5a34c"] },
  Stone: { base: "#85827d", low: "#595854", high: "#aaa79e", palette: ["#666560", "#807e77", "#949188", "#a6a397"] },
};

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: "#171b22",
    cameraPosition: [0, 0, 18],
  });
  camera.fov = 48;
  camera.updateProjectionMatrix();
  clearDefaultLights(scene);
  const ambient = new AmbientLight(0xffffff, 1.3);
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 6, 8);
  const bounce = new DirectionalLight(0xffffff, 0.5);
  bounce.position.set(5, -2, 4);
  scene.add(ambient, key, bounce);

  const params = {
    preset: "Timber" as keyof typeof presets,
    base: presets.Timber.base,
    low: presets.Timber.low,
    high: presets.Timber.high,
    color1: presets.Timber.palette[0],
    color2: presets.Timber.palette[1],
    color3: presets.Timber.palette[2],
    color4: presets.Timber.palette[3],
    weight1: 1,
    weight2: 4,
    weight3: 4,
    weight4: 1,
    seed: 1337,
    bias: 1,
    variance: 0.02,
    hue: 3,
    saturation: 4,
    darker: 8,
    lighter: 8,
    minS: 0,
    maxS: 80,
    minL: 12,
    maxL: 80,
    lighting: "Neutral",
    nextSeed: () => {
      params.seed = (params.seed + 1) % 65536;
      refresh();
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    },
    resetView: () => fit(),
  };

  const labels: Sprite[] = [];
  function label(text: string, x: number, y: number, scale = 0.24, color = "#c1cad8") {
    const sprite = createTextSprite(text, { size: 64, scale, color, x, y, z: 0.35 });
    sprite.material.toneMapped = false;
    scene.add(sprite);
    labels.push(sprite);
  }
  label("COLOR VARIATION", 0, 6.3, 0.45, "#ffffff");
  label("Same samples · different recipes", 0, 5.95, 0.3);
  label("FLAT / UNLIT", -3.45, 5.6, 0.34, "#ffffff");
  label("SHADED / SAME COLORS", 3.45, 5.6, 0.34, "#ffffff");

  const titles = [
    "01  Constant base · reference",
    "02  Hardwood · working-linear HSL ±v/3, ±v, ±v",
    "03  Lightness only · sRGB HSL + bounds",
    "04  Independent H / S / L · sRGB HSL + bounds",
    "05  Two endpoints · linear RGB interpolation",
    "06  Curated palette · uniform selection",
    "07  Curated palette · weighted selection",
    "08  Analogous · seeded legacy recipe, sRGB",
  ];
  const count = 24;
  const geometry = new BoxGeometry(0.43, 0.29, 0.16);
  const flat = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const shaded = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  const rows: [InstancedMesh, InstancedMesh][] = [];
  const transform = new Object3D();
  titles.forEach((title, row) => {
    const y = 4.9 - row * 1.26;
    label(title, 0, y, 0.34);
    const pair: [InstancedMesh, InstancedMesh] = [
      new InstancedMesh(geometry, flat, count),
      new InstancedMesh(geometry, shaded, count),
    ];
    pair.forEach((mesh, side) => {
      for (let i = 0; i < count; i++) {
        transform.position.set((side ? 3.45 : -3.45) + ((i % 12) - 5.5) * 0.49, y - 0.35 - Math.floor(i / 12) * 0.36, 0);
        transform.rotation.set(0, 0, 0);
        transform.updateMatrix();
        mesh.setMatrixAt(i, transform.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
    });
    rows.push(pair);
  });
  label("Center bias: 02–05 · Bounds: 03–04 · Weights: 07", 0, -5.55, 0.3);
  label("Analogous retains its original ranges. Variance = 0 makes row 02 match the base.", 0, -5.95, 0.3);

  const clamp = (value: number, a: number, b: number) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), value));
  function refresh() {
    // Regenerate a fixed three-sample tuple per item. Controls never advance the seed;
    // recipes reuse matching samples, independent of how many channels they vary.
    const rng = createRandom(params.seed);
    const samples = Array.from({ length: count }, () => [rng.next(), rng.next(), rng.next()]);
    const shape = (u: number) => 0.5 + 0.5 * Math.sign(u * 2 - 1) * Math.pow(Math.abs(u * 2 - 1), params.bias);
    const base = new Color(params.base);
    const hsl = base.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
    const palette = [params.color1, params.color2, params.color3, params.color4].map((c) => new Color(c));
    const weights = [params.weight1, params.weight2, params.weight3, params.weight4];
    const weighted = createRandom(params.seed);
    const weightedColors = Array.from({ length: count }, () => {
      const color = weighted.weighted(palette, weights);
      // Match the first value of each three-sample tuple used by the uniform row.
      weighted.next();
      weighted.next();
      return color;
    });
    const bounded = (h: number, s: number, l: number) =>
      new Color().setHSL(
        h,
        clamp(s, params.minS / 100, params.maxS / 100),
        clamp(l, params.minL / 100, params.maxL / 100),
        SRGBColorSpace,
      );
    samples.forEach(([a, b, c], i) => {
      const x = shape(a) * 2 - 1,
        y = shape(b) * 2 - 1,
        z = shape(c) * 2 - 1;
      const lightness = hsl.l + (z * (z < 0 ? params.darker : params.lighter)) / 100;
      // getAnalogousColors currently hardcodes Math.random and can produce negative
      // hue remainders. Adapt its recipe locally without mutating global randomness.
      const hue = (((hsl.h * 360 + Math.floor(-30 + a * 61)) % 360) + 360) % 360;
      const [r, g, blue] = hslToRgb(hue, Math.floor(60 + b * 21), Math.floor(50 + c * 21));
      const colors = [
        base,
        base.clone().offsetHSL((x * params.variance) / 3, y * params.variance, z * params.variance),
        bounded(hsl.h, hsl.s, lightness),
        bounded(hsl.h + (x * params.hue) / 360, hsl.s + (y * params.saturation) / 100, lightness),
        new Color(params.low).lerp(new Color(params.high), shape(a)),
        palette[Math.floor(a * palette.length)],
        weightedColors[i],
        new Color().setRGB(r / 255, g / 255, blue / 255, SRGBColorSpace),
      ];
      rows.forEach((pair, row) => pair.forEach((mesh) => mesh.setColorAt(i, colors[row])));
    });
    rows.forEach((pair) =>
      pair.forEach((mesh) => {
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }),
    );
    key.color.set(params.lighting === "Warm / cool" ? "#fff1dd" : "#ffffff");
    bounce.color.set(params.lighting === "Warm / cool" ? "#8fa8c8" : "#ffffff");
  }

  const gui = new GUI({ title: "Color Variation" });
  gui
    .add(params, "preset", Object.keys(presets))
    .name("Material starting point")
    .onChange(() => {
      const preset = presets[params.preset];
      Object.assign(params, {
        base: preset.base,
        low: preset.low,
        high: preset.high,
        color1: preset.palette[0],
        color2: preset.palette[1],
        color3: preset.palette[2],
        color4: preset.palette[3],
      });
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      refresh();
    });
  gui.addColor(params, "base").name("Base color").onChange(refresh);
  gui.add(params, "seed", 0, 65535, 1).name("Seed").onChange(refresh);
  gui.add(params, "nextSeed").name("Next seed");
  gui.add(params, "bias", 1, 6, 0.1).name("Center bias (1 = uniform)").onChange(refresh);
  gui.add(params, "lighting", ["Neutral", "Warm / cool"]).name("Shaded lighting").onChange(refresh);
  gui.add(params, "resetView").name("Fit study");
  const baseline = gui.addFolder("02 · Hardwood baseline");
  baseline.add(params, "variance", 0, 0.25, 0.005).name("Variance").onChange(refresh);
  const channels = gui.addFolder("03–04 · sRGB HSL offsets");
  channels.add(params, "hue", 0, 60, 0.5).name("Hue ± degrees (04)").onChange(refresh);
  channels.add(params, "saturation", 0, 50, 1).name("Saturation ± points (04)").onChange(refresh);
  channels.add(params, "darker", 0, 50, 1).name("Lightness − points").onChange(refresh);
  channels.add(params, "lighter", 0, 50, 1).name("Lightness + points").onChange(refresh);
  const bounds = gui.addFolder("03–04 · Absolute bounds");
  for (const name of ["minS", "maxS", "minL", "maxL"] as const) {
    bounds
      .add(params, name, 0, 100, 1)
      .name(
        { minS: "Saturation lower %", maxS: "Saturation upper %", minL: "Lightness lower %", maxL: "Lightness upper %" }[name],
      )
      .onChange(refresh);
  }
  bounds.close();
  const endpoints = gui.addFolder("05 · Endpoint colors");
  endpoints.addColor(params, "low").name("Endpoint A").onChange(refresh);
  endpoints.addColor(params, "high").name("Endpoint B").onChange(refresh);
  endpoints.close();
  const paletteFolder = gui.addFolder("06–07 · Palette / weights");
  for (const n of [1, 2, 3, 4] as const) {
    paletteFolder.addColor(params, `color${n}`).name(`Color ${n}`).onChange(refresh);
    paletteFolder.add(params, `weight${n}`, 0, 10, 1).name(`Weight ${n} (07)`).onChange(refresh);
  }
  paletteFolder.close();
  function fit() {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const distance = Math.max(7.2, 7.2 / aspect) / Math.tan((camera.fov * Math.PI) / 360);
    camera.position.set(0, 0.3, distance);
    controls.target.set(0, 0.3, 0);
    controls.update();
  }
  fit();
  refresh();
  return () => {
    gui.destroy();
    rows.forEach((pair) => pair.forEach((mesh) => mesh.dispose()));
    geometry.dispose();
    flat.dispose();
    shaded.dispose();
    labels.forEach((sprite) => {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    });
    dispose();
  };
}
