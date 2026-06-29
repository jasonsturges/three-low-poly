import { MeshLambertMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial } from "three";

export type EmissivePulseMaterial =
  | MeshStandardMaterial
  | MeshPhysicalMaterial
  | MeshLambertMaterial
  | MeshPhongMaterial;

export interface EmissivePulseEffectOptions {
  /** Material whose `emissiveIntensity` will oscillate. Must have emissive set. */
  material: EmissivePulseMaterial;
  /**
   * Pulse frequency in radians per second (`abs(sin(elapsed * speed))`).
   * Defaults to `2`. Primary differentiator when many LEDs share one color.
   */
  speed?: number;
  /** Lower bound of the pulse. Defaults to `0.2`. */
  minIntensity?: number;
  /** Upper bound of the pulse. Defaults to `0.8`. */
  maxIntensity?: number;
}

/**
 * Smooth emissive pulse for fake LEDs — animates `emissiveIntensity` on an existing
 * mesh material without adding geometry or scene lights.
 *
 * Pair with a prefab such as {@link PanelLight}: place the mesh, pass its material
 * here, call `update(dt)` each frame. For a bank of same-color LEDs, give each
 * instance a different `speed` so they breathe out of sync.
 *
 * @example
 * ```ts
 * const led = new PanelLight({ emissive: 0xff0000 });
 * scene.add(led);
 *
 * const pulse = new EmissivePulseEffect({
 *   material: led.material,
 *   speed: 1.4,
 *   minIntensity: 0.05,
 *   maxIntensity: 2,
 * });
 *
 * onFrame((dt) => pulse.update(dt));
 * ```
 */
export class EmissivePulseEffect {
  public speed: number;
  public minIntensity: number;
  public maxIntensity: number;
  public readonly material: EmissivePulseMaterial;

  private elapsed = 0;

  constructor({
    material,
    speed = 2,
    maxIntensity = 0.8,
    minIntensity = 0.2,
  }: EmissivePulseEffectOptions) {
    this.material = material;
    this.speed = speed;
    this.maxIntensity = maxIntensity;
    this.minIntensity = minIntensity;
  }

  /** Advance the pulse by `dt` seconds (elapsed time, not frame index). */
  update(dt: number): void {
    this.elapsed += dt;
    const t = Math.abs(Math.sin(this.elapsed * this.speed));
    this.material.emissiveIntensity = this.minIntensity + t * (this.maxIntensity - this.minIntensity);
  }
}