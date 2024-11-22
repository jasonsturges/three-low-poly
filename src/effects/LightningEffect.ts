import { Light } from "three";
import { randomFloat } from "../utils/RandomNumberUtils";
import { setRandomTimeout } from "../utils/RandomTimer";

export interface LightningEffectOptions {
  light?: Light;
  minIntensity?: number;
  maxIntensity?: number;
  minDuration?: number;
  maxDuration?: number;
}

/**
 * A lightning effect that can be used to simulate a lightning storm.
 * This effect is applied to a light source.
 *
 * Example usage:
 * ```
 * const lightning = new THREE.DirectionalLight(0xffffff, 0);
 * scene.add(lightning);
 * lightning.position.set(5, 10, -5);
 *
 * setRandomInterval(() => {
 *   lightningEffect.triggerLightning();
 * }, 250, 1250);
 * ```
 */
export class LightningEffect {
  private light?: Light;
  public minIntensity: number;
  public maxIntensity: number;
  public minDuration: number;
  public maxDuration: number;

  constructor({
    light, //
    minIntensity = 15,
    maxIntensity = 20,
    minDuration = 50,
    maxDuration = 250,
  }: LightningEffectOptions = {}) {
    this.light = light;
    this.minIntensity = minIntensity;
    this.maxIntensity = maxIntensity;
    this.minDuration = minDuration;
    this.maxDuration = maxDuration;
  }

  public triggerLightning(): void {
    if (this.light) this.light.intensity = randomFloat(this.minIntensity, this.maxIntensity);

    setRandomTimeout(
      () => {
        if (this.light) this.light.intensity = 0;
      },
      this.minDuration,
      this.maxDuration,
    );
  }

  public update(): void {
    if (Math.random() > 0.98) {
      this.triggerLightning();
    }
  }
}
