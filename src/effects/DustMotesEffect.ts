import {
  AdditiveBlending,
  Color,
  ColorRepresentation,
  DynamicDrawUsage,
  InstancedMesh,
  Material,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from "three";
import { randomFloat } from "../utils/RandomNumberUtils";

export interface DustMotesEffectOptions {
  /** Number of dust instances. Defaults to `150`. */
  count?: number;
  /** Horizontal spread (world units). Defaults to `12`. */
  width?: number;
  /** Vertical spawn span (world units). Defaults to `8`. */
  height?: number;
  /** Depth spread (world units). Defaults to `12`. */
  depth?: number;
  /** World Y of the volume floor; motes respawn at the top after settling past it. Defaults to `0`. */
  floorY?: number;
  /** Speck tint. Defaults to `#aebfe6`. */
  color?: ColorRepresentation;
  /** Speck radius (world units). Defaults to `0.02`. */
  radius?: number;
  /** Base material opacity. Defaults to `0.9`. */
  opacity?: number;
  /** Override the default additive speck material. */
  material?: Material;
  /** Minimum settle (fall) speed (units/s). Defaults to `0.1`. */
  settleMin?: number;
  /** Maximum settle (fall) speed (units/s). Defaults to `0.35`. */
  settleMax?: number;
  /** Lateral waft amplitude (units/s). Defaults to `0.08`. */
  waft?: number;
  /** Smallest twinkle scale multiplier. Defaults to `0.6`. */
  scaleMin?: number;
  /** Largest twinkle scale multiplier. Defaults to `1.2`. */
  scaleMax?: number;
  /** Minimum twinkle frequency (rad/s). Defaults to `0.7`. */
  twinkleMin?: number;
  /** Maximum twinkle frequency (rad/s). Defaults to `1.6`. */
  twinkleMax?: number;
}

/**
 * Fine dust drifting through a lit interior — tiny additive specks slowly
 * settling and wafting, twinkling as they catch the light and all but vanishing
 * in shadow. This is the thing that sells a light shaft as volumetric. Additive
 * spheres read the same from any angle, so no billboarding is needed.
 *
 * Call {@link DustMotesEffect.update} each frame with elapsed time in seconds.
 *
 * @example
 * ```typescript
 * const dust = new DustMotesEffect({
 *   count: 150,
 *   width: 8,
 *   height: 9,
 *   depth: 8,
 *   color: "#aebfe6",
 * });
 * scene.add(dust);
 *
 * onFrame((dt) => dust.update(dt));
 * ```
 */
export class DustMotesEffect extends InstancedMesh {
  private readonly width: number;
  private readonly height: number;
  private readonly depth: number;
  private readonly floorY: number;
  private readonly waft: number;
  private readonly scaleMin: number;
  private readonly scaleMax: number;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pz: Float32Array;
  private readonly settle: Float32Array;
  private readonly twinkle: Float32Array;
  private readonly phase: Float32Array;
  private readonly dummy = new Object3D();
  private clock = 0;

  constructor(options: DustMotesEffectOptions = {}) {
    const {
      count = 150,
      width = 12,
      height = 8,
      depth = 12,
      floorY = 0,
      color = "#aebfe6",
      radius = 0.02,
      opacity = 0.9,
      material,
      settleMin = 0.1,
      settleMax = 0.35,
      waft = 0.08,
      scaleMin = 0.6,
      scaleMax = 1.2,
      twinkleMin = 0.7,
      twinkleMax = 1.6,
    } = options;

    const dustMaterial =
      material ??
      new MeshBasicMaterial({
        color: new Color(color),
        transparent: true,
        opacity,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });

    super(new SphereGeometry(radius, 5, 5), dustMaterial, count);
    this.instanceMatrix.setUsage(DynamicDrawUsage);
    this.frustumCulled = false;

    this.width = width;
    this.height = height;
    this.depth = depth;
    this.floorY = floorY;
    this.waft = waft;
    this.scaleMin = scaleMin;
    this.scaleMax = scaleMax;

    this.px = new Float32Array(count);
    this.py = new Float32Array(count);
    this.pz = new Float32Array(count);
    this.settle = new Float32Array(count);
    this.twinkle = new Float32Array(count);
    this.phase = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.respawn(i, true);
      this.settle[i] = randomFloat(settleMin, settleMax);
      this.twinkle[i] = randomFloat(twinkleMin, twinkleMax);
      this.phase[i] = randomFloat(0, Math.PI * 2);
    }

    this.writeMatrices();
  }

  /**
   * Advance the drift and twinkle. Pass elapsed frame time in seconds.
   */
  update(dt: number): void {
    this.clock += dt;

    for (let i = 0; i < this.count; i++) {
      // Slow settle plus a gentle lateral waft on both axes so the field reads
      // as air movement from any viewing angle, not a single-axis slide.
      this.py[i] -= this.settle[i] * dt;
      this.px[i] += Math.sin(this.clock * 0.3 + this.phase[i]) * this.waft * dt;
      this.pz[i] += Math.cos(this.clock * 0.24 + this.phase[i]) * this.waft * dt;

      if (this.py[i] < this.floorY) this.respawn(i, false);
    }

    this.writeMatrices();
  }

  /** Release geometry and materials held by the field. */
  dispose(): this {
    this.geometry.dispose();
    const materials = Array.isArray(this.material) ? this.material : [this.material];
    for (const entry of materials) entry.dispose();
    return this;
  }

  private respawn(index: number, randomHeight: boolean): void {
    this.px[index] = randomFloat(-this.width * 0.5, this.width * 0.5);
    this.pz[index] = randomFloat(-this.depth * 0.5, this.depth * 0.5);
    this.py[index] = randomHeight
      ? this.floorY + randomFloat(0, this.height)
      : this.floorY + this.height;
  }

  private writeMatrices(): void {
    const d = this.dummy;
    for (let i = 0; i < this.count; i++) {
      const t = Math.abs(Math.sin(this.clock * this.twinkle[i] + this.phase[i]));
      const s = this.scaleMin + (this.scaleMax - this.scaleMin) * t;
      d.position.set(this.px[i], this.py[i], this.pz[i]);
      d.scale.setScalar(s);
      d.updateMatrix();
      this.setMatrixAt(i, d.matrix);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}
