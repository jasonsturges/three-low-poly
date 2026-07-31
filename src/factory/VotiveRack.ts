import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  ColorRepresentation,
  CylinderGeometry,
  DataTexture,
  DynamicDrawUsage,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { instancedBufferAttribute, instancedDynamicBufferAttribute, texture } from "three/tsl";
import { SpriteNodeMaterial } from "three/webgpu";
import { flameFlicker } from "../effects/FlameFlickerEffect";
import { glowFalloffTexture } from "../effects/GlowHalo";
import { createRandom } from "../utils/Random";

export interface VotiveRackOptions {
  /** Seed for a reproducible layout. Omit for a different rack every run. */
  seed?: number;
  /** Shelves, bottom to top. Defaults to `4`. */
  rows?: number;
  /** Cups per shelf. Defaults to `8`. */
  columns?: number;
  /** Overall width of the frame. Defaults to `2.2`. */
  width?: number;
  /** Vertical rise per shelf. Defaults to `0.28`. */
  rowRise?: number;
  /**
   * Depth offset per shelf, so upper rows sit back. Defaults to `0.18`.
   *
   * The lowest shelf is the nearest to `+Z` and each row above steps away — stadium seating, so no row hides
   * behind the one in front. The rack stays centered on `z = 0` whatever the row count.
   */
  rowDepth?: number;
  /** Height of the lowest shelf. Defaults to `0.55`. */
  baseHeight?: number;
  /**
   * Fraction of cups holding a candle at all. Defaults to `0.9` — a rack in use has gaps.
   *
   * This is the first step of a **presence cascade**: a cup may be empty; a candle may be spent; only
   * what survives both is lit. Absence is the one thing a per-instance value cannot express, so it is
   * expressed by not allocating the instance.
   */
  density?: number;
  /** Fraction of *present* candles that are lit. Defaults to `0.72`. */
  litFraction?: number;
  /** Shortest candle. Defaults to `0.055`. */
  candleHeightMin?: number;
  /** Tallest candle. Defaults to `0.185`. */
  candleHeightMax?: number;
  /** Flame and glow tint. Defaults to `0xffb347`. */
  color?: ColorRepresentation;
  /** Wax colour. Defaults to `0xd9cdb2`. */
  waxColor?: ColorRepresentation;
  /** Iron colour. Defaults to `0x2b2622`. */
  ironColor?: ColorRepresentation;
  /** Halo card size in world units. Defaults to `0.48`. */
  glowSize?: number;
  /** Halo opacity at flicker peak. Defaults to `0.42`. */
  glowOpacity?: number;
  /**
   * Intensity of the rack's single {@link PointLight}. Defaults to `0`, which omits the light entirely —
   * the flames are unlit emissive geometry and the halos are additive, so the rack reads as a light
   * source while costing no light budget at all.
   *
   * Lights are a fixed budget capped independently of geometry; a hundred votives must never mean a
   * hundred lights. When set, one light serves the whole rack and its intensity follows the *mean* of
   * every fake flame, so it brightens when many happen to flare rather than tracking any one.
   */
  intensity?: number;
  /**
   * Supply a halo falloff instead of the library's canonical ramp — build one with
   * {@link createRadialGradientTexture} if you want different stops or easing.
   *
   * Deliberately a *texture* rather than stops-and-easing options: one ramp shared by the whole rack is
   * what keeps a large population cheap, and a per-asset easing dial would let a rack drift visually
   * away from a single {@link GlowHalo} standing beside it. The caller owns and disposes what it passes.
   */
  haloMap?: DataTexture;
  /** Override the iron material. */
  ironMaterial?: Material;
  /** Override the wax material. */
  waxMaterial?: Material;
}

interface Placement {
  x: number;
  y: number;
  z: number;
  height: number;
  phase: number;
  lit: boolean;
}

/**
 * A tiered rack of votive candles — tens or hundreds of them, in **four draw calls**.
 *
 * Whatever the population, the rack draws: one merged iron frame, one wax batch, one flame batch, one
 * halo batch. Raising the count multiplies triangles, not draws.
 *
 * **Per-instance variety without per-instance objects.** Candle heights vary, some cups are empty, some
 * candles are spent, and every flame flickers on its own phase — all of it carried in instance matrices
 * and instanced attributes rather than in separate `Mesh`es.
 *
 * The **presence cascade** (`density` → `litFraction`) is why the three batches have three different
 * counts: every present candle gets wax, only lit ones get a flame and a halo. Absence cannot be a
 * per-instance value, so the batches are sized to the survivors.
 *
 * **Per-candle flicker with one shared material** works because the halo blending is additive: folding
 * the flicker factor into per-instance *colour* is mathematically identical to scaling opacity, so a
 * single material serves N independently guttering halos.
 *
 * > **Requires `WebGPURenderer`.** Screen-aligned instancing needs a node material
 * > (`SpriteNodeMaterial`) to build each halo's quad in the vertex shader. A single {@link GlowHalo} is
 * > renderer-agnostic; a *batch* of them is not.
 *
 * @example
 * ```typescript
 * const rack = new VotiveRack({ seed: 7, rows: 5, columns: 12, intensity: 1.4 });
 * scene.add(rack);
 *
 * function animate(elapsed: number) {
 *   rack.update(elapsed);
 *   renderer.render(scene, camera);
 * }
 * ```
 *
 * Call {@link dispose} when removing the rack.
 */
export class VotiveRack extends Group {
  /** Every present candle. */
  readonly waxInstances: InstancedMesh;
  /** Only the lit ones. */
  readonly flameInstances: InstancedMesh;
  /** Only the lit ones — screen-aligned, one draw call. */
  readonly haloInstances: InstancedMesh;
  /** The rack's single light, when `intensity > 0`. */
  readonly light?: PointLight;

  readonly #placements: Placement[];
  readonly #lit: Placement[];
  readonly #materials: Material[] = [];
  readonly #geometries: BufferGeometry[] = [];
  readonly #haloScales: Float32Array;
  readonly #haloColors: Float32Array;
  readonly #haloScaleAttribute: InstancedBufferAttribute;
  readonly #haloColorAttribute: InstancedBufferAttribute;
  readonly #tint: Color;
  readonly #glowSize: number;
  readonly #peakIntensity: number;
  readonly #dummy = new Object3D();

  constructor({
    seed,
    rows = 4,
    columns = 8,
    width = 2.2,
    rowRise = 0.28,
    rowDepth = 0.18,
    baseHeight = 0.55,
    density = 0.9,
    litFraction = 0.72,
    candleHeightMin = 0.055,
    candleHeightMax = 0.185,
    color = 0xffb347,
    waxColor = 0xd9cdb2,
    ironColor = 0x2b2622,
    glowSize = 0.48,
    glowOpacity = 0.42,
    intensity = 0,
    haloMap,
    ironMaterial,
    waxMaterial,
  }: VotiveRackOptions = {}) {
    super();

    const source = createRandom(seed);
    this.#tint = new Color(color);
    this.#glowSize = glowSize;
    this.#peakIntensity = intensity;

    // --- iron frame: merged, so the whole fixture is one draw call ------------
    const iron = ironMaterial ?? new MeshStandardMaterial({ color: new Color(ironColor), flatShading: true });
    this.#materials.push(iron);

    const topY = baseHeight + (rows - 1) * rowRise;

    // Z of a shelf, centered so the rack still straddles z=0 whatever the row count. Row 0 is the LOWEST shelf
    // and sits FORWARD; each row above steps back by `rowDepth` — stadium seating, so every candle is visible
    // and reachable over the row in front of it. Shared by the frame and the candle placement below: the two
    // must agree exactly, since the candles stand on these shelves.
    const shelfZ = (row: number) => ((rows - 1) / 2 - row) * rowDepth;

    const frameParts: BufferGeometry[] = [];
    for (const x of [-width / 2, width / 2]) {
      frameParts.push(new CylinderGeometry(0.045, 0.045, topY, 6).translate(x, topY / 2, 0));
    }
    frameParts.push(new BoxGeometry(width + 0.16, 0.065, 0.065).translate(0, topY, 0));
    for (let row = 0; row < rows; row++) {
      const y = baseHeight + row * rowRise;
      frameParts.push(new BoxGeometry(width + 0.1, 0.045, 0.25).translate(0, y, shelfZ(row)));
    }
    const frameGeometry = mergeGeometries(frameParts, false) as BufferGeometry;
    frameParts.forEach((part) => part.dispose());
    this.#geometries.push(frameGeometry);
    const frame = new Mesh(frameGeometry, iron);
    frame.castShadow = true;
    this.add(frame);

    // --- pass one: resolve the presence cascade before allocating anything ----
    // Counts are unknown until the cascade has run, and an InstancedMesh is fixed-size, so placement
    // has to complete first.
    const placements: Placement[] = [];
    const columnStep = width / Math.max(1, columns - 0.35);
    for (let row = 0; row < rows; row++) {
      const y = baseHeight + row * rowRise;
      const z = shelfZ(row);
      for (let column = 0; column < columns; column++) {
        // Rolled only when density < 1, so a full rack draws the same sequence a seed always did.
        if (density < 1 && source.next() >= density) continue;
        placements.push({
          x: -width / 2 + columnStep * (column + 0.18),
          y: y + 0.025,
          z,
          height: source.float(candleHeightMin, candleHeightMax),
          phase: source.float(0, 40),
          lit: litFraction >= 1 || source.next() < litFraction,
        });
      }
    }
    this.#placements = placements;
    this.#lit = placements.filter((p) => p.lit);

    const presentCount = Math.max(placements.length, 1);
    const litCount = Math.max(this.#lit.length, 1);

    // --- wax: one batch, height varies via the instance matrix ----------------
    const waxHeight = 0.12;
    const waxGeometry = new CylinderGeometry(0.043, 0.05, waxHeight, 7);
    waxGeometry.translate(0, waxHeight / 2, 0);
    this.#geometries.push(waxGeometry);
    const wax = waxMaterial ?? new MeshStandardMaterial({ color: new Color(waxColor), roughness: 0.9, flatShading: true });
    this.#materials.push(wax);

    this.waxInstances = new InstancedMesh(waxGeometry, wax, presentCount);
    this.waxInstances.castShadow = true;
    placements.forEach((p, i) => {
      this.#dummy.position.set(p.x, p.y, p.z);
      this.#dummy.scale.set(1, p.height / waxHeight, 1);
      this.#dummy.updateMatrix();
      this.waxInstances.setMatrixAt(i, this.#dummy.matrix);
    });
    this.waxInstances.instanceMatrix.needsUpdate = true;
    this.add(this.waxInstances);

    // --- flame: one batch, the guttering stretch rides in the matrix ----------
    const flameGeometry = new CylinderGeometry(0.002, 0.024, 0.08, 5);
    flameGeometry.translate(0, 0.04, 0);
    this.#geometries.push(flameGeometry);
    const flameMaterial = new MeshBasicMaterial({ color: this.#tint, toneMapped: false, fog: false });
    this.#materials.push(flameMaterial);

    this.flameInstances = new InstancedMesh(flameGeometry, flameMaterial, litCount);
    this.flameInstances.instanceMatrix.setUsage(DynamicDrawUsage);
    this.add(this.flameInstances);

    // --- halos: one batch, screen-aligned in the vertex shader ----------------
    // Defaults to the library's canonical ramp — the same texture a single `GlowHalo` uses, so one
    // candle and a rack of two hundred are identical by construction rather than by both restating the
    // same stops. A supplied `haloMap` belongs to the caller and is never disposed here.
    const haloTexture = haloMap ?? glowFalloffTexture();
    const offsets = new Float32Array(litCount * 3);
    this.#haloScales = new Float32Array(litCount);
    this.#haloColors = new Float32Array(litCount * 3);
    this.#lit.forEach((p, i) => {
      offsets[i * 3] = p.x;
      offsets[i * 3 + 1] = p.y + p.height + 0.035;
      offsets[i * 3 + 2] = p.z;
      this.#haloScales[i] = glowSize;
      this.#haloColors[i * 3] = this.#tint.r;
      this.#haloColors[i * 3 + 1] = this.#tint.g;
      this.#haloColors[i * 3 + 2] = this.#tint.b;
    });

    this.#haloScaleAttribute = new InstancedBufferAttribute(this.#haloScales, 1);
    this.#haloColorAttribute = new InstancedBufferAttribute(this.#haloColors, 3);
    this.#haloScaleAttribute.setUsage(DynamicDrawUsage);
    this.#haloColorAttribute.setUsage(DynamicDrawUsage);

    const haloMaterial = new SpriteNodeMaterial({
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    haloMaterial.positionNode = instancedBufferAttribute(new InstancedBufferAttribute(offsets, 3), "vec3");
    haloMaterial.scaleNode = instancedDynamicBufferAttribute(this.#haloScaleAttribute, "float");
    haloMaterial.colorNode = instancedDynamicBufferAttribute(this.#haloColorAttribute, "vec3");
    // The ramp is colourless, so only its alpha matters here; the tint arrives per instance.
    haloMaterial.opacityNode = texture(haloTexture).a.mul(glowOpacity);
    this.#materials.push(haloMaterial);

    const haloGeometry = new PlaneGeometry(1, 1);
    this.#geometries.push(haloGeometry);
    this.haloInstances = new InstancedMesh(haloGeometry, haloMaterial, litCount);
    // `positionNode` replaces the vertex position, so computed bounds are meaningless.
    this.haloInstances.frustumCulled = false;
    const identity = new Matrix4();
    for (let i = 0; i < litCount; i++) this.haloInstances.setMatrixAt(i, identity);
    this.haloInstances.instanceMatrix.needsUpdate = true;
    this.add(this.haloInstances);

    if (intensity > 0) {
      this.light = new PointLight(this.#tint, intensity, width * 2, 2);
      this.light.position.set(0, baseHeight + (rows - 1) * rowRise * 0.5, 0);
      this.add(this.light);
    }
  }

  /** Present candles, lit or spent. */
  get candleCount(): number {
    return this.#placements.length;
  }

  /** Lit candles — the flame and halo batch size. */
  get litCount(): number {
    return this.#lit.length;
  }

  /** `elapsed` in seconds — the same clock any other flame in the scene advances on. */
  update(elapsed: number): void {
    let sum = 0;

    this.#lit.forEach((p, i) => {
      const f = flameFlicker(elapsed, p.phase);
      sum += f;

      this.#haloScales[i] = this.#glowSize * (0.95 + f * 0.08);
      this.#haloColors[i * 3] = this.#tint.r * f;
      this.#haloColors[i * 3 + 1] = this.#tint.g * f;
      this.#haloColors[i * 3 + 2] = this.#tint.b * f;

      this.#dummy.position.set(p.x, p.y + p.height, p.z);
      this.#dummy.scale.set(1, 0.88 + f * 0.18, 1);
      this.#dummy.updateMatrix();
      this.flameInstances.setMatrixAt(i, this.#dummy.matrix);
    });

    this.#haloScaleAttribute.needsUpdate = true;
    this.#haloColorAttribute.needsUpdate = true;
    this.flameInstances.instanceMatrix.needsUpdate = true;

    if (this.light && this.#lit.length) {
      this.light.intensity = this.#peakIntensity * (sum / this.#lit.length);
    }
  }

  /** Release geometries and materials. The halo ramp is a shared singleton and is deliberately kept. */
  dispose(): void {
    this.#geometries.forEach((geometry) => geometry.dispose());
    this.#materials.forEach((material) => material.dispose());
    this.waxInstances.dispose();
    this.flameInstances.dispose();
    this.haloInstances.dispose();
  }
}
