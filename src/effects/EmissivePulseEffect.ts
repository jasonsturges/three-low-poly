import { MeshLambertMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial } from "three";

export interface EmissivePulseEffectOptions {
  speed?: number;
  maxIntensity?: number;
  minIntensity?: number;
  material: MeshStandardMaterial | MeshPhysicalMaterial | MeshLambertMaterial | MeshPhongMaterial;
}

/**
 * Emissive pulse effect, designed for flickering lights.
 * The emissive intensity of the material will oscillate between `minIntensity` and `maxIntensity`.
 *
 * Use with materials that have emissive properties.
 *
 * Oscillation time = 2π / speed
 *  - Low speed values (e.g., 0.5) will result in a slow pulse
 *  - High speed values (e.g., 10) will result in a rapid flicker
 *
 *  Requires `update()` frame handler with `clock.getElapsedTime()` for animation.
 */
export class EmissivePulseEffect {
  public speed: number;
  public maxIntensity: number;
  public minIntensity: number;
  public material: MeshStandardMaterial | MeshPhysicalMaterial | MeshLambertMaterial | MeshPhongMaterial;

  constructor(options: EmissivePulseEffectOptions) {
    const {
      speed = 2, //
      maxIntensity = 0.8,
      minIntensity = 0.2,
    } = options;

    this.speed = speed;
    this.maxIntensity = maxIntensity;
    this.minIntensity = minIntensity;
    this.material = options.material;
  }

  /**
   * Update the emissive intensity of the material.
   *
   * Use Three.Clock getElapsedTime()
   *
   * Example:
   * ```
   * const clock = new THREE.Clock();
   * effect.update(clock.getElapsedTime());
   * ```
   */
  public update(elapsedTime: number = 0) {
    this.material.emissiveIntensity = this.minIntensity + Math.abs(Math.sin(elapsedTime * this.speed)) * (this.maxIntensity - this.minIntensity);
  }
}
