import {
  BufferGeometry,
  CanvasTexture,
  Color,
  ColorRepresentation,
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  Material,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";
import { randomFloat } from "../utils/RandomNumberUtils";

export interface RainEffectOptions {
  /** Override the streak quad geometry. Defaults to a thin `PlaneGeometry`. */
  geometry?: BufferGeometry;
  /** Override the default streak material. */
  material?: Material;
  /** Maximum number of streak instances. Defaults to `1400`. */
  count?: number;
  /** Horizontal half-extent of the rainfall area (square centered on the origin). Defaults to `26`. */
  area?: number;
  /** Vertical span above `groundY`. Defaults to `22`. */
  height?: number;
  /** World Y where streaks recycle. Defaults to `0`. */
  groundY?: number;
  /** Streak quad width. Defaults to `0.009`. */
  width?: number;
  /** Streak color. Defaults to `#aebfd6`. */
  color?: ColorRepresentation;
  /** Base material opacity at full intensity. Defaults to `0.16`. */
  opacity?: number;
  /** Minimum streak length. Defaults to `0.18`. */
  lengthMin?: number;
  /** Maximum streak length. Defaults to `0.42`. */
  lengthMax?: number;
  /** Minimum fall speed (units/s). Defaults to `11`. */
  speedMin?: number;
  /** Maximum fall speed (units/s). Defaults to `19`. */
  speedMax?: number;
  /**
   * Horizontal compass direction the wind blows (radians, 0 = +X, π/2 = +Z).
   * Only used when {@link RainEffectOptions.windStrength} is greater than zero.
   * Defaults to `0`.
   */
  windDirection?: number;
  /**
   * How much rain tilts and drifts from vertical, as `tan(angleFromVertical)`.
   * `0` = straight down (default). `0.15` ≈ 8.5° lean with matching horizontal drift.
   */
  windStrength?: number;
  /**
   * Rainfall strength (0–1). Scales visible instance count, fall speed, and opacity.
   * Defaults to `0.5`.
   */
  intensity?: number;
}

function createStreakTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.42, "rgba(255,255,255,0.55)");
  gradient.addColorStop(0.58, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 8, 64);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Misty rainfall as instanced vertical streaks.
 *
 * Each streak is a thin, gradient-textured quad animated through a bounded
 * volume. By default streaks fall straight down with no rotation. Optional
 * {@link RainEffectOptions.windDirection} / {@link RainEffectOptions.windStrength}
 * tilt streaks **and** drift them horizontally together, so motion matches the
 * visual angle. Streak materials use `DoubleSide` so thin quads stay visible
 * from any camera angle. Scene fog dissolves distant streaks when the material's
 * `fog` flag is enabled.
 *
 * **`intensity`** (0–1) scales how many instances draw, how fast they fall, and
 * their opacity — useful for storm ramps or lightning flashes.
 *
 * @example
 * ```typescript
 * const rain = new RainEffect({ area: 12, height: 16, intensity: 0.4 });
 * scene.add(rain);
 * scene.fog = new Fog(0x0a0a12, 4, 28);
 *
 * function animate(delta: number) {
 *   rain.update(delta);
 *   renderer.render(scene, camera);
 * }
 * ```
 */
export class RainEffect extends InstancedMesh {
  /** Rainfall strength (0–1). Adjust at runtime for storm variation. */
  intensity: number;

  private readonly maxCount: number;
  private readonly area: number;
  private readonly height: number;
  private readonly groundY: number;
  private readonly baseOpacity: number;
  private readonly windDirection: number;
  private readonly windStrength: number;
  private readonly fallDirection = new Vector3(0, -1, 0);
  private readonly streakOrientation = new Quaternion();
  private readonly sx: Float32Array;
  private readonly sz: Float32Array;
  private readonly topY: Float32Array;
  private readonly len: Float32Array;
  private readonly speed: Float32Array;
  private readonly streakTexture?: CanvasTexture;
  private readonly dummy = new Object3D();
  private clock = 0;

  constructor(options: RainEffectOptions = {}) {
    const {
      count = 1400,
      area = 26,
      height = 22,
      groundY = 0,
      width = 0.009,
      color = "#aebfd6",
      opacity = 0.16,
      lengthMin = 0.18,
      lengthMax = 0.42,
      speedMin = 11,
      speedMax = 19,
      windDirection = 0,
      windStrength = 0,
      intensity = 0.5,
      geometry = new PlaneGeometry(width, 1),
      material,
    } = options;

    const streakTexture = material ? undefined : createStreakTexture();
    const rainMaterial =
      material ??
      new MeshBasicMaterial({
        color: new Color(color),
        map: streakTexture,
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
        fog: true,
        side: DoubleSide,
      });

    super(geometry, rainMaterial, count);
    this.instanceMatrix.setUsage(DynamicDrawUsage);
    this.frustumCulled = false;

    this.maxCount = count;
    this.area = area;
    this.height = height;
    this.groundY = groundY;
    this.baseOpacity = opacity;
    this.windDirection = windDirection;
    this.windStrength = Math.max(0, windStrength);
    this.updateFallDirection(0);
    this.intensity = intensity;
    this.streakTexture = streakTexture;

    this.sx = new Float32Array(count);
    this.sz = new Float32Array(count);
    this.topY = new Float32Array(count);
    this.len = new Float32Array(count);
    this.speed = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.sx[i] = randomFloat(-area, area);
      this.sz[i] = randomFloat(-area, area);
      this.topY[i] = randomFloat(groundY, groundY + height);
      this.len[i] = randomFloat(lengthMin, lengthMax);
      this.speed[i] = randomFloat(speedMin, speedMax);
    }

    this.writeMatrices();
    this.applyIntensity();
  }

  /**
   * Advance streak positions and refresh instance transforms. Pass elapsed frame
   * time in seconds (e.g. from `createScene`'s `onFrame` callback).
   */
  update(dt: number): void {
    this.clock += dt;

    const gust =
      this.windStrength > 0 ? Math.sin(this.clock * 0.18) * 0.04 * this.windStrength : 0;
    this.updateFallDirection(gust);

    const fall = 0.85 + this.intensity * 0.7;
    const top = this.groundY + this.height;
    const driftX = this.fallDirection.x;
    const driftZ = this.fallDirection.z;
    const fallY = -this.fallDirection.y;

    for (let i = 0; i < this.maxCount; i++) {
      const travel = this.speed[i] * fall * dt;
      this.sx[i] += driftX * travel;
      this.sz[i] += driftZ * travel;
      this.topY[i] -= fallY * travel;

      if (this.topY[i] < this.groundY - this.len[i]) this.topY[i] += this.height;
      if (this.topY[i] > top) this.topY[i] -= this.height;

      if (this.sx[i] < -this.area) this.sx[i] += this.area * 2;
      else if (this.sx[i] > this.area) this.sx[i] -= this.area * 2;
      if (this.sz[i] < -this.area) this.sz[i] += this.area * 2;
      else if (this.sz[i] > this.area) this.sz[i] -= this.area * 2;
    }

    this.writeMatrices();
    this.applyIntensity();
  }

  /** Release geometry, materials, and the procedural streak texture. */
  dispose(): this {
    this.geometry.dispose();
    const materials = Array.isArray(this.material) ? this.material : [this.material];
    for (const entry of materials) entry.dispose();
    this.streakTexture?.dispose();
    return this;
  }

  private applyIntensity(): void {
    // Light drizzle still reads at low rainfall.
    this.count = Math.round(this.maxCount * Math.min(1, Math.max(0, 0.38 + this.intensity * 0.62)));

    const mat = this.material as MeshBasicMaterial;
    mat.opacity = this.baseOpacity * (0.55 + 0.65 * this.intensity);
  }

  private updateFallDirection(gust: number): void {
    const lean = this.windStrength + gust;
    if (lean <= 0) {
      this.fallDirection.set(0, -1, 0);
      this.streakOrientation.identity();
      return;
    }

    const horizontal = lean;
    const vertical = 1;
    const invLength = 1 / Math.hypot(horizontal, vertical);
    this.fallDirection.set(
      Math.cos(this.windDirection) * horizontal * invLength,
      -vertical * invLength,
      Math.sin(this.windDirection) * horizontal * invLength,
    );
    this.streakOrientation.setFromUnitVectors(new Vector3(0, 1, 0), this.fallDirection);
  }

  private writeMatrices(): void {
    const d = this.dummy;
    for (let i = 0; i < this.maxCount; i++) {
      const length = this.len[i];
      d.position.set(this.sx[i], this.topY[i] - length / 2, this.sz[i]);
      d.quaternion.copy(this.streakOrientation);
      d.scale.set(1, length, 1);
      d.updateMatrix();
      this.setMatrixAt(i, d.matrix);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}