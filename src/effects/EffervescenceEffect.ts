import {
  BufferGeometry,
  ColorRepresentation,
  DynamicDrawUsage,
  InstancedMesh,
  Material,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from "three";
import { randomFloat } from "../utils/RandomNumberUtils";

export interface EffervescenceEffectOptions {
  /** Override bubble geometry. Defaults to a small `SphereGeometry`. */
  geometry?: BufferGeometry;
  /** Override the default bubble material. */
  material?: Material;
  /** Number of bubble instances. Defaults to `24`. */
  count?: number;
  /** Horizontal spread (world units). Defaults to `1.5`. */
  width?: number;
  /** Vertical column height (world units). Defaults to `3`. */
  height?: number;
  /** Depth spread (world units). Defaults to `1.5`. */
  depth?: number;
  /**
   * Horizontal spawn inset (0–1). Scales width/depth spawn area inward so a
   * square volume fits round vessels. `1` = full box; `0.88` (default) trims corners.
   */
  spread?: number;
  /** World Y where bubbles spawn when they recycle. Defaults to `0`. */
  baseY?: number;
  /** Minimum rise speed (units/s). Defaults to `0.35`. */
  speedMin?: number;
  /** Maximum rise speed (units/s). Defaults to `0.85`. */
  speedMax?: number;
  /** Bubble tint when using the default material. Defaults to `0xffffff`. */
  color?: ColorRepresentation;
  /** Default material opacity. Defaults to `0.6`. */
  opacity?: number;
  /** Default material emissive intensity. Defaults to `0`. */
  emissiveIntensity?: number;
}

/**
 * Carbonation bubbles rising through a bounded volume — seltzer, soda, or
 * brewing liquid. Each instance drifts upward at its own speed and respawns
 * near {@link EffervescenceEffectOptions.baseY} after reaching the top.
 *
 * Spawn positions use a square footprint (`width` × `depth`). {@link EffervescenceEffectOptions.spread}
 * pulls that box inward so round jars do not get occasional corner outliers.
 * Position and scale the effect to sit inside a jar, flask, or panel viewport.
 * Call {@link EffervescenceEffect.update} each frame with elapsed time in seconds.
 *
 * @example
 * ```typescript
 * const fizz = new EffervescenceEffect({ width: 1.2, height: 2.5, count: 30 });
 * fizz.position.set(0, 1.2, 0);
 * scene.add(fizz);
 *
 * onFrame((dt) => fizz.update(dt));
 * ```
 */
export class EffervescenceEffect extends InstancedMesh {
  private readonly width: number;
  private readonly height: number;
  private readonly depth: number;
  private readonly baseY: number;
  private readonly spread: number;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pz: Float32Array;
  private readonly speed: Float32Array;
  private readonly dummy = new Object3D();

  constructor(options: EffervescenceEffectOptions = {}) {
    const {
      count = 24,
      width = 1.5,
      height = 3,
      depth = 1.5,
      spread = 0.88,
      baseY = 0,
      speedMin = 0.35,
      speedMax = 0.85,
      color = 0xffffff,
      opacity = 0.6,
      emissiveIntensity = 0,
      geometry = new SphereGeometry(0.08, 6, 6),
      material,
    } = options;

    const bubbleMaterial =
      material ??
      new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity,
        transparent: true,
        opacity,
        roughness: 0.3,
        metalness: 0.1,
      });

    super(geometry, bubbleMaterial, count);
    this.instanceMatrix.setUsage(DynamicDrawUsage);
    this.frustumCulled = false;

    this.width = width;
    this.height = height;
    this.depth = depth;
    this.baseY = baseY;
    this.spread = Math.min(1, Math.max(0, spread));

    this.px = new Float32Array(count);
    this.py = new Float32Array(count);
    this.pz = new Float32Array(count);
    this.speed = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.respawn(i, true);
      this.speed[i] = randomFloat(speedMin, speedMax);
    }

    this.writeMatrices();
  }

  /**
   * Advance bubble positions. Pass elapsed frame time in seconds (e.g. from
   * `createScene`'s `onFrame` callback).
   */
  update(dt: number): void {
    const ceiling = this.baseY + this.height;
    for (let i = 0; i < this.count; i++) {
      this.py[i] += this.speed[i] * dt;
      if (this.py[i] > ceiling) this.respawn(i, false);
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
    const halfX = this.width * 0.5 * this.spread;
    const halfZ = this.depth * 0.5 * this.spread;
    this.px[index] = randomFloat(-halfX, halfX);
    this.pz[index] = randomFloat(-halfZ, halfZ);
    this.py[index] = randomHeight
      ? this.baseY + Math.random() * this.height
      : this.baseY + randomFloat(0, this.height * 0.15);
  }

  private writeMatrices(): void {
    const d = this.dummy;
    for (let i = 0; i < this.count; i++) {
      d.position.set(this.px[i], this.py[i], this.pz[i]);
      d.updateMatrix();
      this.setMatrixAt(i, d.matrix);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}