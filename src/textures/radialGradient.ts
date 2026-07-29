import {
  ClampToEdgeWrapping,
  Color,
  ColorRepresentation,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";
import { Easing, type EasingFunction } from "../constants/Easing";

/** One stop of a radial falloff. */
export interface RadialGradientStop {
  /** Distance from the core: `0` at the center, `1` at the rim. */
  offset: number;
  color: ColorRepresentation;
  /** Opacity at this stop, `0`–`1`. Defaults to `1`. */
  alpha?: number;
}

export interface RadialGradientTextureOptions {
  /** Falloff from core to rim. Sorted internally, so declaration order doesn't matter. */
  stops: RadialGradientStop[];
  /**
   * Edge length in texels. Defaults to `128`, which is a power of two (so mipmaps are exact) and
   * ample for a smooth ramp: bilinear filtering interpolates *between* texels, so upsampling a
   * gradient loses nothing perceptible. Banding in a glow comes from the 8-bit framebuffer, not
   * from texture size, so raising this rarely helps.
   */
  size?: number;
  /**
   * How each pair of stops is interpolated. Defaults to {@link Easing.linear}, which matches a
   * canvas gradient exactly.
   *
   * Linear interpolation leaves a **slope discontinuity** at every stop — brightness stays
   * continuous, but its rate of change kinks. Human vision exaggerates precisely those kinks
   * (Mach banding), so a linear ramp reads as having a faint ring at the rim and a hard edge where
   * two glows overlap. {@link Easing.smoothstep} brings the derivative to zero at each stop, which
   * removes the ring and softens the outer edge without changing overall brightness.
   */
  easing?: EasingFunction;
  /**
   * TODO: add an opt-in `dither` amount. A sub-1/255 ordered or blue-noise perturbation per texel
   * breaks up the concentric plateaus an 8-bit framebuffer produces in a glow's faint tail — the one
   * remaining lever on that banding, and it needs no shader, no DOM, and no renderer requirement.
   * Note `Easing.smoothstep` makes the plateaus *wider* near the rim, so the two interact.
   */
}

interface ResolvedStop {
  offset: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * A soft radial falloff as a {@link DataTexture} — for the additive cards that give a light source
 * its bloom of haze.
 *
 * Pixels are computed here in plain JavaScript, so unlike a `CanvasTexture` this needs **no DOM**
 * and builds fine headless or in a worker. And unlike a TSL node gradient it produces a standard
 * texture, so it runs on **either renderer** rather than requiring `WebGPURenderer` — which matters
 * for near-field glows (lanterns, candles, flames) that have no other reason to demand WebGPU.
 *
 * Stops interpolate in **sRGB**, matching what a canvas gradient does, and the texture is tagged
 * `SRGBColorSpace` so color management converts it correctly. Pass `easing` to soften the kink each
 * stop otherwise leaves in the falloff's slope.
 *
 * @example
 * ```typescript
 * const material = new MeshBasicMaterial({
 *   map: createRadialGradientTexture({
 *     stops: [
 *       { offset: 0, color: 0xffcd8c, alpha: 0.45 },
 *       { offset: 0.25, color: 0xff963c, alpha: 0.14 },
 *       { offset: 1, color: 0xff6e1e, alpha: 0 },
 *     ],
 *   }),
 *   blending: AdditiveBlending,
 *   transparent: true,
 *   depthWrite: false,
 * });
 * ```
 */
export const createRadialGradientTexture = ({
  stops,
  size = 128,
  easing = Easing.linear,
}: RadialGradientTextureOptions): DataTexture => {
  if (stops.length === 0) throw new Error("createRadialGradientTexture requires at least one stop.");

  // Resolve to sRGB bytes once. `getHex` returns sRGB regardless of the working color space, so
  // this stays correct whether or not color management is enabled.
  const ordered: ResolvedStop[] = [...stops]
    .sort((first, second) => first.offset - second.offset)
    .map((stop) => {
      const hex = new Color(stop.color).getHex(SRGBColorSpace);
      return {
        offset: stop.offset,
        r: (hex >> 16) & 255,
        g: (hex >> 8) & 255,
        b: hex & 255,
        a: Math.round((stop.alpha ?? 1) * 255),
      };
    });

  const first = ordered[0]!;
  const last = ordered[ordered.length - 1]!;
  const data = new Uint8Array(size * size * 4);
  const center = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Texel center, normalized so 1 lands on the inscribed circle. Corners exceed 1 and clamp to
      // the final stop, which is why a fully transparent rim leaves no square edge.
      const dx = (x + 0.5 - center) / center;
      const dy = (y + 0.5 - center) / center;
      const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 1);

      let low = first;
      let high = last;
      for (let i = 1; i < ordered.length; i++) {
        if (distance <= ordered[i]!.offset) {
          low = ordered[i - 1]!;
          high = ordered[i]!;
          break;
        }
      }

      const span = high.offset - low.offset;
      const raw = span <= 0 ? 0 : Math.min(Math.max((distance - low.offset) / span, 0), 1);
      const t = easing(raw);

      const stride = (y * size + x) * 4;
      data[stride] = low.r + (high.r - low.r) * t;
      data[stride + 1] = low.g + (high.g - low.g) * t;
      data[stride + 2] = low.b + (high.b - low.b) * t;
      data[stride + 3] = low.a + (high.a - low.a) * t;
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.colorSpace = SRGBColorSpace;
  // `DataTexture` defaults both filters to `NearestFilter`, which would render a smooth ramp as
  // visible blocks. Mipmaps cover the case where the card is minified far from the viewer.
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  // Clamped so the transparent rim can't bleed across from the opposite edge.
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
};
