import { DirectionalLight } from "three";
import { randomFloat } from "../utils/RandomNumberUtils";

export interface LightningEffectOptions {
  /** Directional light driven by lightning flashes. Start at intensity `0`. */
  light: DirectionalLight;
  /** Peak light intensity at full flash. Defaults to `12`. */
  peak?: number;
  /** Minimum seconds between strikes. Defaults to `3`. */
  minGap?: number;
  /** Maximum seconds between strikes. Defaults to `9`. */
  maxGap?: number;
}

/**
 * Thunderstorm lightning that drives a {@link DirectionalLight} each frame.
 *
 * Rather than scheduling timeouts (which need careful teardown), each strike
 * enqueues two or three decaying intensity spikes a few frames apart — the
 * characteristic stutter of real lightning. Read {@link LightningEffect.level}
 * after {@link LightningEffect.update} to sync fog, sky, rain, or emissive
 * surfaces with the flash.
 *
 * @example
 * ```typescript
 * const bolt = new DirectionalLight(0xcdd8ff, 0);
 * bolt.position.set(5, 12, -8);
 * bolt.target.position.set(0, 0, 0);
 * scene.add(bolt, bolt.target);
 *
 * const storm = new LightningEffect({ light: bolt, peak: 12, minGap: 3, maxGap: 9 });
 *
 * function animate(delta: number) {
 *   storm.update(delta);
 *   const flash = storm.level; // 0..~1.2
 *   renderer.render(scene, camera);
 * }
 * ```
 */
export class LightningEffect {
  /** Current flash level, 0 = dark. Read after each {@link LightningEffect.update}. */
  level = 0;

  private readonly light: DirectionalLight;
  private readonly peak: number;
  private readonly minGap: number;
  private readonly maxGap: number;
  private readonly spikes: { at: number; amp: number }[] = [];
  private clock = 0;
  private nextStrike: number;

  constructor({ light, peak = 12, minGap = 3, maxGap = 9 }: LightningEffectOptions) {
    this.light = light;
    this.peak = peak;
    this.minGap = minGap;
    this.maxGap = maxGap;
    this.nextStrike = randomFloat(minGap * 0.3, maxGap);
  }

  /**
   * Advance the strike schedule and update the driven light intensity. Pass
   * elapsed frame time in seconds.
   */
  update(dt: number): void {
    this.clock += dt;
    if (this.clock >= this.nextStrike) this.strike();

    let level = 0;
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const spike = this.spikes[i];
      const age = this.clock - spike.at;
      if (age < 0) continue;
      const value = spike.amp * Math.exp(-age * 9);
      if (value < 0.002 && age > 0) {
        this.spikes.splice(i, 1);
      } else {
        level += value;
      }
    }

    this.level = Math.min(1.2, level);
    this.light.intensity = this.level * this.peak;
  }

  /** Force the driven light dark, e.g. when lightning is toggled off. */
  quiet(): void {
    this.level = 0;
    this.light.intensity = 0;
  }

  private strike(): void {
    const bursts = Math.random() < 0.5 ? 2 : 3;
    for (let i = 0; i < bursts; i++) {
      this.spikes.push({
        at: this.clock + i * randomFloat(0.04, 0.12),
        amp: randomFloat(0.5, 1),
      });
    }
    this.nextStrike = this.clock + randomFloat(this.minGap, this.maxGap);
  }
}