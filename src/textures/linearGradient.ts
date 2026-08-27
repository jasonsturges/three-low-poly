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

/** One stop of a linear ramp. */
export interface LinearGradientStop {
  /** Position along the ramp: `0` at the start (first row), `1` at the end (last row). */
  offset: number;
  color: ColorRepresentation;
  /** Opacity at this stop, `0`–`1`. Defaults to `1`. */
  alpha?: number;
}

export interface LinearGradientTextureOptions {
  /** The ramp, start to end. Sorted internally, so declaration order doesn't matter. */
  stops: LinearGradientStop[];
  /** Length of the ramp in texels. Defaults to `128` (a power of two, so mipmaps are exact). */
  size?: number;
  /**
   * How each pair of stops is interpolated. Defaults to {@link Easing.linear}, matching a canvas gradient.
   * {@link Easing.smoothstep} brings the slope to zero at each stop, removing the faint Mach band a linear
   * ramp leaves.
   */
  easing?: EasingFunction;
}

/**
 * A linear gradient as a {@link DataTexture} — the straight-ramp sibling of {@link createRadialGradientTexture}.
 *
 * A linear gradient varies only along one axis, so the image is just a tall strip a few columns wide (the
 * texture's V axis, first row → last). Rotate the texture (`texture.rotation`) for any other direction.
 * Computed in plain JS, so no DOM — builds headless, on either renderer. Stops interpolate in sRGB.
 *
 * Useful as a `scene.background` (a moody backdrop), a sky strip, or the fade of a rain/fog card.
 *
 * @example
 * ```typescript
 * scene.background = createLinearGradientTexture({
 *   stops: [
 *     { offset: 0, color: 0x28323f }, // bottom
 *     { offset: 1, color: 0x0c1016 }, // top
 *   ],
 * });
 * ```
 */
export const createLinearGradientTexture = ({
  stops,
  size = 128,
  easing = Easing.linear,
}: LinearGradientTextureOptions): DataTexture => {
  if (stops.length === 0) throw new Error("createLinearGradientTexture requires at least one stop.");

  const ordered = [...stops]
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
  const width = 4; // only varies along the ramp; a few columns is the whole image
  const data = new Uint8Array(width * size * 4);

  for (let y = 0; y < size; y++) {
    const pos = size === 1 ? 0 : y / (size - 1);

    let low = first;
    let high = last;
    for (let i = 1; i < ordered.length; i++) {
      if (pos <= ordered[i]!.offset) {
        low = ordered[i - 1]!;
        high = ordered[i]!;
        break;
      }
    }

    const span = high.offset - low.offset;
    const raw = span <= 0 ? 0 : Math.min(Math.max((pos - low.offset) / span, 0), 1);
    const t = easing(raw);
    const r = low.r + (high.r - low.r) * t;
    const g = low.g + (high.g - low.g) * t;
    const b = low.b + (high.b - low.b) * t;
    const a = low.a + (high.a - low.a) * t;

    for (let x = 0; x < width; x++) {
      const stride = (y * width + x) * 4;
      data[stride] = r;
      data[stride + 1] = g;
      data[stride + 2] = b;
      data[stride + 3] = a;
    }
  }

  const texture = new DataTexture(data, width, size, RGBAFormat, UnsignedByteType);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
};
