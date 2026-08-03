import GUI from "lil-gui";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BoulderGeometry, mulberry32 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Rubble Wall",
  description:
    "STUDY — not a coursed wall. RUBBLE: irregular stones, tumbled to any angle, packed TIGHTER than " +
    "their own size so they overlap and close up rather than leaving joints. The Stone Wall study is " +
    "dressed blocks in courses; this is what you build when the stone arrives as it was found. " +
    "The real question here is BAKING, and it is the one case where neither previous answer is right. " +
    "Merging gives one draw call but a unique vertex set per stone. Instancing one geometry gives one " +
    "draw call and no variety at all. So: a POOL of K varieties, each instanced — K draw calls, K " +
    "geometries, and variety that stops being countable at surprisingly small K. Drag Varieties from 1 " +
    "upward and find where you stop seeing the repeat; the Readout prices both strategies at once.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  RUBBLE       stone used roughly as found, not squared. RANDOM rubble is uncoursed; SNECKED rubble uses
//               small fillers; COURSED rubble is leveled up every so often. This is random rubble.
//  ASHLAR       the opposite — squared, dressed stone in regular courses. The Stone Wall study.
//  HEARTING     the rubble core between two faced skins. Why a real rubble wall is so thick.
//  VARIETY POOL not a masonry term. K distinct geometries instanced many times each, which is the middle
//               ground between one instanced geometry (no variety) and merging (no sharing).

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x14161c,
    cameraPosition: [3.2, 2.2, 4.6],
  });

  controls.target.set(0, 1.3, 0);
  controls.update();

  const key = new DirectionalLight(0xfff2e2, 1.5);
  key.position.set(3, 3, 3);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-2.5, 0.5, -2);
  scene.add(key, bounce);

  const wire = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });

  const params = {
    width: 3.4,
    height: 2.6,
    stoneSize: 0.34,
    packing: 0.8,
    varieties: 4,
    stoneDetail: 1,
    strategy: "pool" as "pool" | "merged",

    jitterXY: 0.3,
    jitterZ: 0.1,
    tumble: 0.3,
    freeSpin: true,
    scaleMin: 0.7,
    scaleMax: 1.3,

    stoneColor: "#7a746c",
    colorVariance: 0.1,
    seed: 0x2c1a,
    readout: "",
    price: "",
  };

  const stage = new Group();
  scene.add(stage);

  // Instanced meshes share their geometry with nothing else, but a pool's geometries are shared by one
  // mesh each — collect distinctly either way.
  const clear = () => {
    const seen = new Set<BufferGeometry>();
    for (const child of [...stage.children]) {
      if (child instanceof InstancedMesh || child instanceof Mesh) {
        seen.add(child.geometry);
        if (child instanceof InstancedMesh) child.dispose();
        stage.remove(child);
      }
    }
    for (const geometry of seen) geometry.dispose();
  };

  const rebuild = () => {
    clear();

    const random = mulberry32(params.seed);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    const base = new Color(params.stoneColor);
    const tint = new Color();

    // Packed TIGHTER than the stone, so neighbors overlap and the wall closes. A rubble wall has no
    // joints to speak of — the stones simply bear on each other, and the gaps are filled with hearting.
    const spacing = params.stoneSize * params.packing;
    const columns = Math.max(1, Math.floor(params.width / spacing));
    const rows = Math.max(1, Math.floor(params.height / spacing));
    const total = columns * rows;
    const varieties = Math.max(1, Math.round(params.varieties));

    const boulder = (seed: number) =>
      new BoulderGeometry({
        radius: params.stoneSize * 0.5,
        detail: Math.max(0, Math.round(params.stoneDetail)),
        noiseHeight: params.stoneSize * 0.16,
        noiseScale: 1.6,
        seed,
      });

    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Euler();
    const quaternion = new Quaternion();
    const scale = new Vector3();

    /** One stone's placement. Identical in both strategies, so the comparison is honest. */
    const place = (row: number, column: number) => {
      // Alternate rows shift, the same instinct as a bond — though rubble has no courses to bond.
      const offset = (row % 2) * spacing * 0.3;
      position.set(
        -params.width / 2 + (column + 0.5) * spacing + offset + signed(params.stoneSize * params.jitterXY),
        (row + 0.5) * spacing + signed(params.stoneSize * params.jitterXY),
        signed(params.stoneSize * params.jitterZ),
      );
      rotation.set(
        signed(params.tumble),
        signed(params.tumble),
        // A found stone has no up. Turn this off and they all sit the same way, which reads as machined.
        params.freeSpin ? random() * Math.PI * 2 : signed(params.tumble),
      );
      const uniform = params.scaleMin + random() * Math.max(0, params.scaleMax - params.scaleMin);
      scale.set(
        uniform * (0.9 + random() * 0.2),
        uniform * (0.9 + random() * 0.2),
        uniform * (0.9 + random() * 0.2),
      );
      quaternion.setFromEuler(rotation);
      matrix.compose(position, quaternion, scale);
      tint
        .copy(base)
        .offsetHSL(signed(params.colorVariance) / 4, signed(params.colorVariance) / 2, signed(params.colorVariance));
    };

    let drawCalls = 0;
    let geometries = 0;
    let tris = 0;
    let vertexSets = 0;

    if (params.strategy === "pool") {
      // K geometries, K meshes. Every stone borrows one of K shapes and hides the borrowing behind its
      // own rotation, scale and tint.
      const pool = Array.from({ length: varieties }, (_, i) => boulder(params.seed + i * 101));
      const assigned: number[][] = pool.map(() => []);
      const draws: Matrix4[][] = pool.map(() => []);
      const tints: Color[][] = pool.map(() => []);

      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          place(row, column);
          const which = Math.floor(random() * varieties) % varieties;
          assigned[which]!.push(0);
          draws[which]!.push(matrix.clone());
          tints[which]!.push(tint.clone());
        }
      }

      pool.forEach((geometry, i) => {
        const count = draws[i]!.length;
        if (count === 0) {
          geometry.dispose();
          return;
        }
        const mesh = new InstancedMesh(geometry, wire, count);
        draws[i]!.forEach((m, k) => mesh.setMatrixAt(k, m));
        tints[i]!.forEach((c, k) => mesh.setColorAt(k, c));
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = mesh.receiveShadow = true;
        stage.add(mesh);
        drawCalls++;
        geometries++;
        tris += (geometry.getIndex()?.count ?? geometry.getAttribute("position").count) / 3;
      });
      vertexSets = varieties;
    } else {
      // Every stone its own shape, all merged. One draw call, and a unique vertex set per stone.
      const parts: BufferGeometry[] = [];
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          place(row, column);
          const geometry = boulder(params.seed + parts.length * 7);
          geometry.applyMatrix4(matrix);
          const count = geometry.attributes.position!.count;
          const colors = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            colors[i * 3] = tint.r;
            colors[i * 3 + 1] = tint.g;
            colors[i * 3 + 2] = tint.b;
          }
          geometry.setAttribute("color", new BufferAttribute(colors, 3));
          parts.push(geometry);
        }
      }
      const merged = mergeGeometries(parts, false);
      parts.forEach((part) => part.dispose());
      if (!merged) return;
      const mesh = new Mesh(merged, wire);
      mesh.castShadow = mesh.receiveShadow = true;
      stage.add(mesh);
      drawCalls = 1;
      geometries = 1;
      vertexSets = total;
      tris = merged.getAttribute("position").count / 3;
    }

    params.readout = `${total} stones · ${columns} × ${rows} · ${varieties} varieties`;
    // The price of BOTH strategies, always — the point is the comparison, not the current setting.
    const perStone = tris / (params.strategy === "pool" ? Math.max(1, varieties) : Math.max(1, total));
    params.price =
      params.strategy === "pool"
        ? `POOL: ${drawCalls} draws · ${geometries} geometries · ${Math.round(perStone * varieties).toLocaleString()} tris resident   (merged would be: 1 draw · ${Math.round(perStone * total).toLocaleString()} tris)`
        : `MERGED: 1 draw · 1 geometry · ${Math.round(tris).toLocaleString()} tris resident   (a pool of ${varieties} would be: ${varieties} draws · ${Math.round(perStone * varieties).toLocaleString()} tris)`;
    void vertexSets;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Rubble Wall");

  const wall = gui.addFolder("Wall");
  wall.add(params, "width", 1, 8, 0.1).name("Width").onChange(rebuild);
  wall.add(params, "height", 0.5, 6, 0.1).name("Height").onChange(rebuild);
  wall.add(params, "stoneSize", 0.1, 1, 0.02).name("Stone Size").onChange(rebuild);
  // Below 1 the stones overlap and the wall closes. At 1 they touch; above it, daylight.
  wall.add(params, "packing", 0.5, 1.2, 0.02).name("Packing (× size)").onChange(rebuild);
  wall.open();

  const baking = gui.addFolder("Baking — the study");
  // THE question. 1 is a wall of clones; 12 is effectively unlimited. Find where you stop seeing it.
  baking.add(params, "varieties", 1, 16, 1).name("Varieties (K)").onChange(rebuild);
  baking
    .add(params, "strategy", { "Pool — K instanced": "pool", "Merged — all unique": "merged" })
    .name("Strategy")
    .onChange(rebuild);
  baking.add(params, "stoneDetail", 0, 3, 1).name("Stone Detail").onChange(rebuild);
  baking.open();

  const variation = gui.addFolder("Variation");
  variation.add(params, "jitterXY", 0, 0.8, 0.02).name("Jitter XY").onChange(rebuild);
  variation.add(params, "jitterZ", 0, 0.5, 0.02).name("Jitter Z").onChange(rebuild);
  variation.add(params, "tumble", 0, 1, 0.02).name("Tumble").onChange(rebuild);
  // A found stone has no up. Off, they all sit the same way and it reads as machined.
  variation.add(params, "freeSpin").name("Free Spin").onChange(rebuild);
  variation.add(params, "scaleMin", 0.3, 1.5, 0.02).name("Scale Min").onChange(rebuild);
  variation.add(params, "scaleMax", 0.3, 1.5, 0.02).name("Scale Max").onChange(rebuild);

  const color = gui.addFolder("Color");
  color.addColor(params, "stoneColor").name("Stone Color").onChange(rebuild);
  color.add(params, "colorVariance", 0, 0.35, 0.005).name("Color Variance").onChange(rebuild);
  color.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Readout").listen().disable();
  readout.add(params, "price").name("Price").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    wire.dispose();
    dispose();
  };
}
