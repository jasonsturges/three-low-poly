import {
  BufferGeometry,
  Color,
  ColorRepresentation,
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  Material,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { EllipticLeafGeometry } from "../geometry/leafs/EllipticLeafGeometry";
import { randomFloat } from "../utils/RandomNumberUtils";

export interface PetalDriftEffectOptions {
  /** Override petal geometry. Defaults to {@link EllipticLeafGeometry}. */
  geometry?: BufferGeometry;
  /** Override the default petal material. */
  material?: Material;
  /** Number of petal instances. Defaults to `120`. */
  count?: number;
  /** Horizontal spread (world units). Defaults to `16`. */
  width?: number;
  /** Vertical spawn span (world units). Defaults to `8`. */
  height?: number;
  /** Depth spread (world units). Defaults to `16`. */
  depth?: number;
  /** World Y where petals respawn after drifting below the floor. Defaults to `0`. */
  floorY?: number;
  /** Minimum fall speed (units/s). Defaults to `0.12`. */
  fallSpeedMin?: number;
  /** Maximum fall speed (units/s). Defaults to `0.28`. */
  fallSpeedMax?: number;
  /** Minimum horizontal drift speed (units/s). Defaults to `0.04`. */
  driftMin?: number;
  /** Maximum horizontal drift speed (units/s). Defaults to `0.14`. */
  driftMax?: number;
  /**
   * Flutter strength (radians). Subtle rotation sway as each petal falls.
   * Defaults to `0.35`.
   */
  flutter?: number;
  /** Single petal color or palette; multiple entries pick a random color per petal. */
  color?: ColorRepresentation | ColorRepresentation[];
}

/**
 * Soft, slow-drifting petals (or leaves) falling through a bounded volume —
 * cherry-blossom float rather than stiff tumble. Each instance drifts downward
 * with gentle horizontal wander and a light sinusoidal flutter.
 *
 * Call {@link PetalDriftEffect.update} each frame with elapsed time in seconds.
 *
 * @example
 * ```typescript
 * const petals = new PetalDriftEffect({
 *   count: 80,
 *   color: [0xffd6f0, 0xfff0f8, 0xf8c8e0],
 *   flutter: 0.3,
 * });
 * scene.add(petals);
 *
 * onFrame((dt) => petals.update(dt));
 * ```
 */
export class PetalDriftEffect extends InstancedMesh {
  private readonly width: number;
  private readonly height: number;
  private readonly depth: number;
  private readonly floorY: number;
  private readonly flutter: number;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pz: Float32Array;
  private readonly fallSpeed: Float32Array;
  private readonly driftX: Float32Array;
  private readonly driftZ: Float32Array;
  private readonly rotX: Float32Array;
  private readonly rotY: Float32Array;
  private readonly rotZ: Float32Array;
  private readonly phase: Float32Array;
  private readonly dummy = new Object3D();
  private clock = 0;

  constructor(options: PetalDriftEffectOptions = {}) {
    const {
      count = 120,
      width = 16,
      height = 8,
      depth = 16,
      floorY = 0,
      fallSpeedMin = 0.12,
      fallSpeedMax = 0.28,
      driftMin = 0.04,
      driftMax = 0.14,
      flutter = 0.35,
      color = [0xffd6f0, 0xfff5fa, 0xf0b8d0],
      geometry = new EllipticLeafGeometry(),
      material,
    } = options;

    const palette = (Array.isArray(color) ? color : [color]).map((entry) => new Color(entry));
    const petalMaterial =
      material ??
      new MeshStandardMaterial({
        color: palette.length === 1 ? palette[0].getHex() : 0xffffff,
        metalness: 0.05,
        roughness: 0.85,
        flatShading: true,
        side: DoubleSide,
      });

    super(geometry, petalMaterial, count);
    this.instanceMatrix.setUsage(DynamicDrawUsage);
    this.frustumCulled = false;

    this.width = width;
    this.height = height;
    this.depth = depth;
    this.floorY = floorY;
    this.flutter = flutter;

    this.px = new Float32Array(count);
    this.py = new Float32Array(count);
    this.pz = new Float32Array(count);
    this.fallSpeed = new Float32Array(count);
    this.driftX = new Float32Array(count);
    this.driftZ = new Float32Array(count);
    this.rotX = new Float32Array(count);
    this.rotY = new Float32Array(count);
    this.rotZ = new Float32Array(count);
    this.phase = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.respawn(i, true);
      this.fallSpeed[i] = randomFloat(fallSpeedMin, fallSpeedMax);
      const drift = randomFloat(driftMin, driftMax);
      const angle = randomFloat(0, Math.PI * 2);
      this.driftX[i] = Math.cos(angle) * drift;
      this.driftZ[i] = Math.sin(angle) * drift;
      this.phase[i] = randomFloat(0, Math.PI * 2);

      if (palette.length > 1) {
        this.setColorAt(i, palette[Math.floor(Math.random() * palette.length)]);
      }
    }

    if (this.instanceColor) this.instanceColor.needsUpdate = true;
    this.writeMatrices();
  }

  /**
   * Advance petal positions and flutter. Pass elapsed frame time in seconds.
   */
  update(dt: number): void {
    this.clock += dt;

    for (let i = 0; i < this.count; i++) {
      const sway = Math.sin(this.clock * 1.6 + this.phase[i]) * this.flutter * 0.12;
      this.px[i] += (this.driftX[i] + sway) * dt;
      this.py[i] -= this.fallSpeed[i] * dt;
      this.pz[i] += (this.driftZ[i] + Math.cos(this.clock * 1.3 + this.phase[i]) * this.flutter * 0.08) * dt;

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
      ? this.floorY + randomFloat(this.height * 0.35, this.height)
      : this.floorY + this.height + randomFloat(0, this.height * 0.25);
    this.rotX[index] = randomFloat(-0.6, 0.6);
    this.rotY[index] = randomFloat(-Math.PI, Math.PI);
    this.rotZ[index] = randomFloat(-0.8, 0.8);
  }

  private writeMatrices(): void {
    const d = this.dummy;
    for (let i = 0; i < this.count; i++) {
      const flutterX = Math.sin(this.clock * 2.1 + this.phase[i]) * this.flutter;
      const flutterZ = Math.cos(this.clock * 1.7 + this.phase[i]) * this.flutter * 0.6;
      d.position.set(this.px[i], this.py[i], this.pz[i]);
      d.rotation.set(this.rotX[i] + flutterX, this.rotY[i], this.rotZ[i] + flutterZ);
      d.updateMatrix();
      this.setMatrixAt(i, d.matrix);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}