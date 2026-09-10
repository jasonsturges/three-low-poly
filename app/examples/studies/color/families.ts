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
  type Sprite,
} from "three";
import { RandomColor, createRandom, deriveSubSeed } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { clearDefaultLights } from "../../../framework/clearDefaultLights";
import { createTextSprite } from "../../../framework/createTextSprite";

export const meta = {
  title: "Color Families",
  description:
    "STUDY — the same six authored colors, used three ways by SDK RandomColor samplers: pick exact entries, interpolate along one connected gradient, or select a family and interpolate only inside its endpoint pair. Edit the three pairs to describe timber, autumn, or blossom colors. Weights affect only family selection; all-zero weights fall back to equal selection. Gradient stops are equally spaced in displayed order A1, B1, A2, B2, A3, B3. Both columns receive identical working-space colors. Separate seeded streams per slot keep comparisons stable when strategies consume different numbers of random values. These palettes are illustrative artistic choices, not factory defaults.",
};

const presets = {
  Autumn: ["#9b4926", "#d68035", "#97702b", "#d9b650", "#493526", "#846044"],
  Timber: ["#493729", "#93714f", "#584031", "#876449", "#65503a", "#a0845b"],
  Blossom: ["#b8718a", "#e8abc0", "#e4c4c8", "#fff2ed", "#ba819e", "#f0c3dd"],
};

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, { background: "#171b22", cameraPosition: [0, 0, 17] });
  camera.fov = 48;
  camera.updateProjectionMatrix();
  clearDefaultLights(scene);
  const ambient = new AmbientLight(0xffffff, 1.3);
  const key = new DirectionalLight(0xfff1dd, 2.2);
  key.position.set(-3, 6, 8);
  const bounce = new DirectionalLight(0x8fa8c8, 0.5);
  bounce.position.set(5, -2, 4);
  scene.add(ambient, key, bounce);

  const params = {
    preset: "Autumn" as keyof typeof presets,
    seed: 1337,
    lighting: "Warm / cool",
    a1: presets.Autumn[0],
    b1: presets.Autumn[1],
    a2: presets.Autumn[2],
    b2: presets.Autumn[3],
    a3: presets.Autumn[4],
    b3: presets.Autumn[5],
    weight1: 5,
    weight2: 3,
    weight3: 2,
    nextSeed() {
      params.seed = (params.seed + 1) % 65536;
      refresh();
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    },
    fit: () => fit(),
  };
  const labels: Sprite[] = [];
  function label(text: string, x: number, y: number, scale = 0.35) {
    const sprite = createTextSprite(text, { x, y, z: 0.3, size: 64, scale, color: "#d9e0ea" });
    sprite.material.toneMapped = false;
    scene.add(sprite);
    labels.push(sprite);
  }
  label("COLOR FAMILIES", 0, 5.8, 0.5);
  label("Six colors · three ways to use them", 0, 5.35);
  label("FAMILY 1", -4, 4.7);
  label("FAMILY 2", 0, 4.7);
  label("FAMILY 3", 4, 4.7);
  const geometry = new BoxGeometry(0.43, 0.32, 0.16);
  const flat = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const shaded = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  const anchors = new InstancedMesh(geometry, flat, 6);
  const transform = new Object3D();
  for (let i = 0; i < 6; i++) {
    transform.position.set((Math.floor(i / 2) - 1) * 4 + (i % 2 ? 0.55 : -0.55), 4.15, 0);
    transform.scale.set(1.8, 1.4, 1);
    transform.updateMatrix();
    anchors.setMatrixAt(i, transform.matrix);
  }
  anchors.instanceMatrix.needsUpdate = true;
  scene.add(anchors);
  label("FLAT / UNLIT", -3.45, 3.4);
  label("SHADED / SAME COLORS", 3.45, 3.4);
  const titles = [
    "01  Pick · exact authored colors",
    "02  Gradient · one connected path",
    "03  Mix · choose a family, then interpolate inside it",
  ];
  const subtitles = [
    "Six entries, equal probability",
    "A1 → B1 → A2 → B2 → A3 → B3",
    "Three endpoint pairs, weighted family selection",
  ];
  const count = 48;
  const rows: [InstancedMesh, InstancedMesh][] = [];
  titles.forEach((title, row) => {
    const y = 2.7 - row * 2.35;
    label(title, 0, y);
    label(subtitles[row], 0, y - 0.35, 0.29);
    const pair: [InstancedMesh, InstancedMesh] = [
      new InstancedMesh(geometry, flat, count),
      new InstancedMesh(geometry, shaded, count),
    ];
    pair.forEach((mesh, side) => {
      for (let i = 0; i < count; i++) {
        transform.position.set((side ? 3.45 : -3.45) + ((i % 12) - 5.5) * 0.49, y - 0.8 - Math.floor(i / 12) * 0.38, 0);
        transform.scale.set(1, 1, 1);
        transform.updateMatrix();
        mesh.setMatrixAt(i, transform.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
    });
    rows.push(pair);
  });
  label("Endpoint edits affect every row. Family weights affect row 03 only.", 0, -4.6, 0.3);
  label("Interpolation uses linear RGB. No hue drift, clamping, or bias is applied.", 0, -5, 0.3);

  function refresh() {
    const colors = [params.a1, params.b1, params.a2, params.b2, params.a3, params.b3];
    const samplers = [
      RandomColor.pick(colors),
      RandomColor.gradient(colors.map((color, index) => ({ at: index / (colors.length - 1), color }))),
      RandomColor.mix(
        [
          RandomColor.between(params.a1, params.b1),
          RandomColor.between(params.a2, params.b2),
          RandomColor.between(params.a3, params.b3),
        ],
        [params.weight1, params.weight2, params.weight3],
      ),
    ];
    const tint = new Color();
    colors.forEach((color, index) => anchors.setColorAt(index, tint.set(color)));
    if (anchors.instanceColor) anchors.instanceColor.needsUpdate = true;
    rows.forEach((pair, row) => {
      for (let index = 0; index < count; index++) {
        // Independent per-slot streams give each strategy the same starting sample,
        // without letting mix's extra draw shift all following slots.
        samplers[row](tint, { index, random: createRandom(deriveSubSeed(params.seed, index)) });
        pair.forEach((mesh) => mesh.setColorAt(index, tint));
      }
      pair.forEach((mesh) => {
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      });
    });
    key.color.set(params.lighting === "Warm / cool" ? "#fff1dd" : "#ffffff");
    bounce.color.set(params.lighting === "Warm / cool" ? "#8fa8c8" : "#ffffff");
  }
  const gui = new GUI({ title: "Color Families" });
  gui
    .add(params, "preset", Object.keys(presets))
    .name("Starting palette")
    .onChange(() => {
      const [a1, b1, a2, b2, a3, b3] = presets[params.preset];
      Object.assign(params, { a1, b1, a2, b2, a3, b3 });
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      refresh();
    });
  gui.add(params, "seed", 0, 65535, 1).name("Seed").onChange(refresh);
  gui.add(params, "nextSeed").name("Next seed");
  gui.add(params, "lighting", ["Neutral", "Warm / cool"]).name("Shaded lighting").onChange(refresh);
  gui.add(params, "fit").name("Fit study");
  for (const n of [1, 2, 3] as const) {
    const folder = gui.addFolder(`Family ${n}`);
    folder.addColor(params, `a${n}`).name("Endpoint A").onChange(refresh);
    folder.addColor(params, `b${n}`).name("Endpoint B").onChange(refresh);
    folder.add(params, `weight${n}`, 0, 10, 1).name("Weight (row 03)").onChange(refresh);
  }
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
    anchors.dispose();
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
