import GUI from "lil-gui";
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  type DataTexture,
} from "three";
import { instancedBufferAttribute, instancedDynamicBufferAttribute, texture } from "three/tsl";
import { SpriteNodeMaterial } from "three/webgpu";
import { GlowHalo, glowFalloffTexture } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Candle and Rack",
  description:
    "STUDY — one candle beside a rack, from a single spec, by genuinely different mechanics. The candle " +
    "owns its parts (3 draw calls). The rack is three InstancedMeshes: wax, flame, and screen-aligned " +
    "halos — 3 draw calls no matter how many candles. Watch the measured draw count as you raise the " +
    "count, then look for a seam between the two. If you can tell which is which, the spec isn't the " +
    "single source of truth yet.",
};

// ─── ONE SPEC ────────────────────────────────────────────────────────────────
const CANDLE = {
  waxRadius: 0.09,
  waxTopRadius: 0.11,
  waxHeight: 0.35,
  flameRadius: 0.03,
  flameHeight: 0.12,
  glowSize: 0.9,
  glowOpacity: 0.6,
  glowColor: 0xffaa44,
  waxColor: 0xd9cdb2,
  flicker: { base: 0.84, a1: 0.1, f1: 10.7, a2: 0.06, f2: 18.1, k: 1.7 },
} as const;

type CandleSpec = typeof CANDLE;

// ─── SHARED TRUTH ────────────────────────────────────────────────────────────
// The `pumpkinStemMatrix` idea: placement and animation as pure functions, so both strategies
// agree by *calling the same code* rather than by restating the same numbers.
const partY = (s: CandleSpec) => s.waxHeight + s.flameHeight * 0.5;

const flickerAt = (t: number, phase: number, f: CandleSpec["flicker"]) =>
  f.base + f.a1 * Math.sin(t * f.f1 + phase) + f.a2 * Math.sin(t * f.f2 + phase * f.k);

const haloScaleAt = (s: CandleSpec, f: number) => s.glowSize * (0.95 + f * 0.08);
const flameStretchAt = (f: number) => 0.88 + f * 0.18;

// ─── SHARED RESOURCES ────────────────────────────────────────────────────────
interface Resources {
  ramp: DataTexture;
  wax: CylinderGeometry;
  flame: CylinderGeometry;
}

function buildResources(s: CandleSpec): Resources {
  const wax = new CylinderGeometry(s.waxRadius, s.waxTopRadius, s.waxHeight, 7);
  wax.translate(0, s.waxHeight / 2, 0);
  return {
    // The library's canonical ramp, not a local restatement of it — that restatement is exactly how a
    // seam appears between one candle and a batch of them.
    ramp: glowFalloffTexture(),
    wax,
    flame: new CylinderGeometry(0.002, s.flameRadius, s.flameHeight, 5),
  };
}

interface Built {
  group: Group;
  update(t: number): void;
  dispose(): void;
}

// ─── STRATEGY A — one candle: an object per part ──────────────────────────────
function buildOneCandle(s: CandleSpec, r: Resources): Built {
  const group = new Group();

  const waxMaterial = new MeshStandardMaterial({ color: s.waxColor, roughness: 0.9, flatShading: true });
  group.add(new Mesh(r.wax, waxMaterial));

  const flameMaterial = new MeshBasicMaterial({ color: s.glowColor, toneMapped: false, fog: false });
  const flame = new Mesh(r.flame, flameMaterial);
  flame.position.y = partY(s);
  group.add(flame);

  const halo = new GlowHalo({ map: r.ramp, color: s.glowColor, size: s.glowSize, opacity: s.glowOpacity });
  halo.position.y = partY(s);
  group.add(halo);

  const light = new PointLight(s.glowColor, 1.2, 4, 2);
  light.position.y = partY(s);
  group.add(light);

  return {
    group,
    update(t) {
      const f = flickerAt(t, 0, s.flicker);
      halo.setOpacity(s.glowOpacity * f);
      halo.scale.setScalar(haloScaleAt(s, f));
      flame.scale.y = flameStretchAt(f);
      light.intensity = 1.2 * f;
    },
    dispose() {
      waxMaterial.dispose();
      flameMaterial.dispose();
      halo.dispose();
    },
  };
}

// ─── STRATEGY B — a rack: three InstancedMeshes, any population ────────────────
function buildRack(s: CandleSpec, r: Resources, rows: number, columns: number): Built {
  const group = new Group();
  const count = rows * columns;
  const step = 0.34;
  const tint = new Color(s.glowColor);

  const positions: { x: number; z: number; phase: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      positions.push({
        x: (column - (columns - 1) / 2) * step,
        z: (row - (rows - 1) / 2) * step,
        phase: (row * columns + column) * 1.37,
      });
    }
  }

  // --- wax: static, one draw call, renderer-agnostic --------------------------
  const waxMaterial = new MeshStandardMaterial({ color: s.waxColor, roughness: 0.9, flatShading: true });
  const waxMesh = new InstancedMesh(r.wax, waxMaterial, count);
  const dummy = new Object3D();
  positions.forEach((p, i) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    waxMesh.setMatrixAt(i, dummy.matrix);
  });
  waxMesh.instanceMatrix.needsUpdate = true;
  group.add(waxMesh);

  // --- flame: one draw call; the stretch rides in the instance matrix ---------
  const flameMaterial = new MeshBasicMaterial({ color: s.glowColor, toneMapped: false, fog: false });
  const flameMesh = new InstancedMesh(r.flame, flameMaterial, count);
  flameMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  group.add(flameMesh);

  // --- halos: one draw call, screen-aligned via SpriteNodeMaterial ------------
  // `positionNode` supplies each halo's center, `scaleNode` its size, `colorNode` its tint. Because the
  // blending is ADDITIVE, folding the flicker factor into color is identical to scaling opacity — which
  // is how per-candle flicker survives with a single shared material.
  const offsets = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  positions.forEach((p, i) => {
    offsets[i * 3] = p.x;
    offsets[i * 3 + 1] = partY(s);
    offsets[i * 3 + 2] = p.z;
    scales[i] = s.glowSize;
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  });

  const scaleAttribute = new InstancedBufferAttribute(scales, 1);
  const colorAttribute = new InstancedBufferAttribute(colors, 3);
  scaleAttribute.setUsage(DynamicDrawUsage);
  colorAttribute.setUsage(DynamicDrawUsage);

  const haloMaterial = new SpriteNodeMaterial({
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  haloMaterial.positionNode = instancedBufferAttribute(new InstancedBufferAttribute(offsets, 3), "vec3");
  haloMaterial.scaleNode = instancedDynamicBufferAttribute(scaleAttribute, "float");
  haloMaterial.colorNode = instancedDynamicBufferAttribute(colorAttribute, "vec3");
  // The ramp is white with the falloff in alpha, so only alpha is needed here.
  haloMaterial.opacityNode = texture(r.ramp).a.mul(s.glowOpacity);

  const haloGeometry = new PlaneGeometry(1, 1);
  const haloMesh = new InstancedMesh(haloGeometry, haloMaterial, count);
  // `positionNode` replaces the vertex position, so the computed bounds are meaningless.
  haloMesh.frustumCulled = false;
  const identity = new Matrix4();
  for (let i = 0; i < count; i++) haloMesh.setMatrixAt(i, identity);
  haloMesh.instanceMatrix.needsUpdate = true;
  group.add(haloMesh);

  // One light for the whole fixture, driven by the aggregate of the fakes.
  const light = new PointLight(s.glowColor, 1.2, 6, 2);
  light.position.y = partY(s);
  group.add(light);

  return {
    group,
    update(t) {
      let sum = 0;
      for (let i = 0; i < count; i++) {
        const f = flickerAt(t, positions[i]!.phase, s.flicker);
        sum += f;

        scales[i] = haloScaleAt(s, f);
        colors[i * 3] = tint.r * f;
        colors[i * 3 + 1] = tint.g * f;
        colors[i * 3 + 2] = tint.b * f;

        dummy.position.set(positions[i]!.x, partY(s), positions[i]!.z);
        dummy.scale.set(1, flameStretchAt(f), 1);
        dummy.updateMatrix();
        flameMesh.setMatrixAt(i, dummy.matrix);
      }
      scaleAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
      flameMesh.instanceMatrix.needsUpdate = true;
      light.intensity = 1.2 * (sum / count);
    },
    dispose() {
      waxMaterial.dispose();
      flameMaterial.dispose();
      haloMaterial.dispose();
      haloGeometry.dispose();
      waxMesh.dispose();
      flameMesh.dispose();
      haloMesh.dispose();
    },
  };
}

export default function (container: HTMLElement) {
  const { scene, renderer, onFrame, controls, dispose } = createScene(container, {
    background: 0x07070b,
    cameraPosition: [0, 1.1, 3.4],
  });
  controls.target.set(0, 0.3, 0);
  controls.update();

  const params = { rows: 3, columns: 5 };
  const measured = { candles: 0, drawCalls: 0, triangles: 0 };

  // The renderer clears `info` at the top of its own animation loop — i.e. immediately BEFORE our
  // per-frame callback — so reading it there always yields zero. Take ownership of the reset instead,
  // which is exactly what `autoReset` exists for.
  renderer.info.autoReset = false;

  const resources = buildResources(CANDLE);
  let built: Built[] = [];

  const rebuild = () => {
    for (const b of built) {
      scene.remove(b.group);
      b.dispose();
    }

    const one = buildOneCandle(CANDLE, resources);
    one.group.position.x = -1.15;
    scene.add(one.group);

    const rack = buildRack(CANDLE, resources, params.rows, params.columns);
    rack.group.position.x = 0.6;
    scene.add(rack.group);

    built = [one, rack];
    measured.candles = 1 + params.rows * params.columns;
  };
  rebuild();

  onFrame(() => {
    // Totals accumulated by the previous frame's render, then cleared for this one.
    measured.drawCalls = renderer.info.render.drawCalls;
    measured.triangles = renderer.info.render.triangles;
    renderer.info.reset();

    const t = performance.now() * 0.001;
    for (const b of built) b.update(t);
  });

  const gui = new GUI();
  gui.title("Candle and Rack");
  gui.add(params, "rows", 1, 12, 1).name("Rack Rows").onChange(rebuild);
  gui.add(params, "columns", 1, 20, 1).name("Rack Columns").onChange(rebuild);

  const measuredFolder = gui.addFolder("Measured");
  measuredFolder.add(measured, "candles").name("Candles").disable().listen();
  measuredFolder.add(measured, "drawCalls").name("Draw Calls").disable().listen();
  measuredFolder.add(measured, "triangles").name("Triangles").disable().listen();
  measuredFolder.open();

  return () => {
    gui.destroy();
    for (const b of built) {
      scene.remove(b.group);
      b.dispose();
    }
    // `ramp` is a shared singleton — not ours to dispose.
    resources.wax.dispose();
    resources.flame.dispose();
    dispose();
  };
}
