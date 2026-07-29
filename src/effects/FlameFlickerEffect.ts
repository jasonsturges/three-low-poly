import { Color, ColorRepresentation, MeshBasicMaterial, PointLight } from "three";
import { GlowHalo } from "./GlowHalo";

export interface FlameFlickerEffectOptions {
  /**
   * Desyncs multiple instances. Defaults to `Math.random() * 100`.
   */
  seed?: number;
  /** Optional real light — use sparingly; casts on geometry but counts against light limits. */
  light?: PointLight;
  /** Base intensity when `light` is set. Defaults to `4`. */
  lightIntensity?: number;
  /**
   * Optional flame core material (e.g. `MeshBasicMaterial` on a small sphere).
   *
   * TODO: `update()` mutates `flame.color` in place, so several flickers sharing one material will
   * fight over it and gutter in lockstep. Give each flame its own material, or move the tint off
   * the shared material. Worth a runtime warning or a doc note at minimum.
   */
  flame?: MeshBasicMaterial;
  /** Flame tint when `flame` is set. Defaults to `0xffaa44`. */
  flameColor?: ColorRepresentation;
  /** Optional {@link GlowHalo}; opacity scales with the flicker factor. */
  halo?: GlowHalo;
  /**
   * Halo opacity multiplier at flicker peak. Defaults to `0.75`.
   *
   * TODO: this duplicates {@link GlowHalo}'s own `opacity`. Once a flicker drives a halo, whatever
   * `opacity` the halo was constructed with is overwritten every frame, so two places own one
   * number. Decide which is authoritative — probably read the halo's own opacity as the peak.
   */
  haloOpacity?: number;
}

/**
 * Calm flame flicker from detuned sines — drives optional real lights, flame
 * materials, and {@link GlowHalo} opacity in sync. Time-based (`update(dt)`).
 *
 * Use without a `light` for mass candlefields (halo + bloom only). Add a
 * `light` for hero sconces that must cast on walls and props.
 */
/**
 * Flicker factor from a sum of detuned sines — roughly `0.5`–`1.1`, never repeating because the two
 * frequencies are incommensurate.
 *
 * A plain function on purpose: **mass populations want one loop over an array, not N flicker objects each
 * carrying a clock.** {@link FlameFlickerEffect} is the convenience wrapper for a single flame; anything
 * driving many flames — a chandelier, a votive rack — should call this directly with a per-item `phase`.
 *
 * @param elapsed - Seconds.
 * @param phase - Per-item offset, so a population doesn't gutter in unison.
 */
export function flameFlicker(elapsed: number, phase = 0): number {
  return 0.8 + 0.2 * Math.sin(elapsed * 9 + phase) + 0.08 * Math.sin(elapsed * 23 + phase * 2);
}

export class FlameFlickerEffect {
  public readonly seed: number;
  public light?: PointLight;
  public lightIntensity: number;
  public flame?: MeshBasicMaterial;
  public halo?: GlowHalo;
  public haloOpacity: number;

  private readonly flameColor = new Color();
  private elapsed = 0;

  constructor({
    seed = Math.random() * 100,
    light,
    lightIntensity = 4,
    flame,
    flameColor = 0xffaa44,
    halo,
    haloOpacity = 0.75,
  }: FlameFlickerEffectOptions = {}) {
    this.seed = seed;
    this.light = light;
    this.lightIntensity = lightIntensity;
    this.flame = flame;
    this.flameColor.set(flameColor);
    this.halo = halo;
    this.haloOpacity = haloOpacity;
  }

  /**
   * Flicker factor at elapsed time — lazy sum of detuned sines (~0.5–1.1).
   */
  static factor(elapsed: number, seed: number): number {
    return flameFlicker(elapsed, seed);
  }

  /** Current flicker factor after the last `update`. */
  get level(): number {
    return FlameFlickerEffect.factor(this.elapsed, this.seed);
  }

  update(dt: number): void {
    this.elapsed += dt;
    const f = FlameFlickerEffect.factor(this.elapsed, this.seed);

    if (this.light) {
      this.light.intensity = this.lightIntensity * f;
    }

    if (this.flame) {
      this.flame.color.copy(this.flameColor).multiplyScalar(0.8 + 0.4 * f);
    }

    if (this.halo) {
      this.halo.setOpacity(this.haloOpacity * f);
    }
  }

}