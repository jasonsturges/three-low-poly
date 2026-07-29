import { AdditiveBlending, Color, ColorRepresentation, DataTexture, Sprite, SpriteMaterial } from "three";
import { Easing } from "../constants/Easing";
import { createRadialGradientTexture, type RadialGradientStop } from "../textures/radialGradient";

/**
 * Neutral falloff — white, so the tint lives entirely on the material. Alphas match the original
 * canvas ramp (`ff` / `aa` / `00`).
 */
const NEUTRAL_FALLOFF: RadialGradientStop[] = [
  { offset: 0, color: 0xffffff, alpha: 1 },
  { offset: 0.25, color: 0xffffff, alpha: 0.67 },
  { offset: 1, color: 0xffffff, alpha: 0 },
];

let sharedFalloff: DataTexture | undefined;

/**
 * **The library's canonical glow falloff** — one cached texture, shared by everything that draws a glow.
 *
 * This exists so there is exactly one definition of what a glow looks like. A single {@link GlowHalo} and
 * a batched field of hundreds must be visually identical, and the only way to guarantee that is for both
 * to call this rather than each restating the same stops and easing. Duplicating the ramp is how a seam
 * appears.
 *
 * Colourless by design, so the tint lives on the material and one 64 KB texture serves any population and
 * any colour. Never disposed — it is a module-level singleton other halos are still using.
 *
 * TODO: settle `smoothstep` vs `linear` here. Because everything now shares this ramp, the choice is a
 * library-wide aesthetic decision rather than a per-asset one. `smoothstep` softens the rim (it zeroes the
 * slope at each stop, which kills the Mach band a linear kink produces) but raises core and mid alpha, so
 * a dense arrangement merges into one mass instead of reading as distinct glows. Jason confirmed `linear`
 * reproduces his existing look and holds up better in a packed ring. Changing it here changes every glow —
 * which is the point, and why it needs deciding once rather than exposing an `easing` dial per asset.
 */
export function glowFalloffTexture(): DataTexture {
  sharedFalloff ??= createRadialGradientTexture({ stops: NEUTRAL_FALLOFF, easing: Easing.smoothstep });
  return sharedFalloff;
}

export interface GlowHaloOptions {
  /**
   * Glow tint, multiplied over the falloff. Defaults to `0xffaa44` — or to white when `map` is
   * supplied, so a coloured texture passes through untouched.
   *
   * The default ramp is colourless, so with it this *is* the halo's colour.
   */
  color?: ColorRepresentation;
  /** Card edge length in world units. Defaults to `1.2`. */
  size?: number;
  /** Base opacity before flicker scaling. Defaults to `0.75`. */
  opacity?: number;
  /**
   * Supply your own falloff texture instead of the shared default — typically one built with
   * {@link createRadialGradientTexture} and **shared across many halos**, which is what makes a large
   * population cheap: one texture, N materials.
   *
   * The caller owns it. {@link GlowHalo.dispose} will not release a texture it did not create.
   *
   * A supplied map may carry its own colours (a blue core inside a warm rim, say), so `color` defaults
   * to white here — a tint multiplies, and multiply can only darken, never add a hue that isn't there.
   */
  map?: DataTexture;
}

/**
 * Soft glow card — reads as light without spending a `PointLight`.
 *
 * Lights are a **fixed budget**, capped independently of how much geometry you draw, and
 * exhausting the fragment-uniform space makes materials fail to compile outright rather than
 * degrade. Halos scale the other way: they are ordinary blended sprites, so hundreds cost hundreds
 * of cheap quads and no light slots at all. The usual arrangement is many halos plus one
 * real light per fixture, its intensity driven by the aggregate of the fakes.
 *
 * **It billboards itself.** `GlowHalo` *is* a `Sprite`, so it faces the viewer with no per-frame
 * call to forget, and every instance shares one internal quad geometry. Position and scale it
 * directly — `halo.position.copy(flame.position)`.
 *
 * **Tint is applied once, on the material.** The falloff texture is colorless and shared across
 * every default halo, so `setColor` is free and a rack of hundreds still holds a single texture.
 *
 * **Additive on purpose.** Light adds, and additive keeps overlaps *flat*: as one glow dims the next
 * brightens at the same rate, so their sum stays constant where they meet. Bright cores can clip at
 * 1.0 without an HDR target, which reads as a blown-out white centre — acceptable, and the consumer's
 * to solve with tone mapping or bloom if they want to.
 *
 * A screen blend (`a + b - ab`) is tempting since it never clips, but its `-ab` term is largest where
 * two contributions are *equal* — the middle of every overlap — so it carves a shallow dark basin
 * exactly where glows meet. Measurably worse for a cluster of candles. `material` is public if you
 * want to try it anyway; screen also needs `premultipliedAlpha`, or the destination factor will refer
 * to the untinted texel and darken everything behind the card.
 *
 * **A card that intersects its fixture gets sliced along the intersection.** That seam is inherent to
 * representing glare as a world-space quad: real glare is a camera effect and spills *over* whatever
 * sits in front of the flame, while a quad occupying world space cannot. The levers are physical —
 * keep `size` modest relative to the fixture, and let a bloom pass (the consumer's choice) carry the
 * wide spread. `depthWrite` stays off so halos never occlude one another.
 *
 * @example
 * ```typescript
 * const halo = new GlowHalo({ color: 0xffaa44, size: 0.9 });
 * halo.position.set(0, 1.4, 0);
 * scene.add(halo);
 *
 * // Drive it from a flicker, or leave it steady.
 * halo.setOpacity(0.75 * flicker);
 * ```
 *
 * @see {@link FlameFlickerEffect} to modulate opacity, and {@link createRadialGradientTexture}
 * for the falloff itself.
 */
// TODO: extract a reusable `GlowHaloField`. The pattern is already PROVEN in `VotiveRack` — one
// `InstancedMesh` + `SpriteNodeMaterial`, `positionNode`/`scaleNode`/`colorNode` as instanced attributes,
// and per-item flicker folded into colour (identical to scaling opacity, because the blending is additive).
// So this is no longer a question of feasibility, only of whether a second mass consumer appears to justify
// lifting it out of the rack. Cost either way: screen-aligned instancing needs a node material, i.e.
// WebGPU. N separate `GlowHalo`s stays correct for dozens.
export class GlowHalo extends Sprite {
  declare material: SpriteMaterial;

  constructor({ color, size = 1.2, opacity = 0.75, map }: GlowHaloOptions = {}) {
    const texture = map ?? glowFalloffTexture();
    // A supplied map may already be coloured, so the tint falls back to identity rather than
    // multiplying someone's blue core by warm orange. Multiply can only darken.
    const tint = color ?? (map !== undefined ? 0xffffff : 0xffaa44);

    super(
      new SpriteMaterial({
        map: texture,
        // Single tint. Baking color into the ramp *and* setting it here squares the color, which
        // is why glows used to read darker and more saturated than the value asked for.
        color: new Color(tint),
        transparent: true,
        opacity,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    );

    this.scale.setScalar(size);
  }

  /** Set halo opacity (e.g. scaled each frame by {@link FlameFlickerEffect}). */
  setOpacity(opacity: number): void {
    this.material.opacity = opacity;
  }

  get opacity(): number {
    return this.material.opacity;
  }

  /** Retint. Free — the falloff is colorless, so nothing is rebuilt. */
  setColor(color: ColorRepresentation): void {
    this.material.color.set(color);
  }

  /**
   * Release the material. Textures are never released here — the shared default is still in use by other
   * halos, and a supplied `map` belongs to whoever built it.
   */
  dispose(): void {
    this.material.dispose();
  }
}
