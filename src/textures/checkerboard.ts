import {
  DataTexture,
  NearestFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";

export interface CheckerboardTextureOptions {
  /**
   * Texture edge length in texels, which is also the number of alternating squares per tile.
   * Defaults to `2` — the smallest true checker, and all you need when tiling a large plane via
   * `texture.repeat`.
   *
   * **Rounded up to an even number.** The pattern alternates on `(x ^ y) & 1`, so with an odd
   * count the parity repeats where the tile wraps and two same-colored rows meet at every seam.
   */
  size?: number;
}

/**
 * A hard-edged checkerboard as a {@link DataTexture} — the classic chessboard or tile floor.
 *
 * Nearest filtering keeps the squares crisp instead of blurring them, and the texture repeats, so
 * a two-texel array can cover an arbitrarily large plane:
 *
 * @example
 * ```typescript
 * const texture = createCheckerboardTexture({ size: 2 });
 * texture.repeat.set(8, 8); // 8×8 squares across the plane
 *
 * const floor = new Mesh(new PlaneGeometry(10, 10), new MeshStandardMaterial({ map: texture }));
 * floor.rotation.x = -Math.PI / 2;
 * ```
 */
export const createCheckerboardTexture = ({ size = 2 }: CheckerboardTextureOptions = {}): DataTexture => {
  // Even counts only, so the pattern stays continuous across the repeat seam.
  const texels = Math.max(2, Math.ceil(size / 2) * 2);
  const data = new Uint8Array(texels * texels * 4);

  for (let i = 0; i < texels * texels; i++) {
    const stride = i * 4;
    const shade = ((i % texels) ^ Math.floor(i / texels)) & 1 ? 255 : 0;
    data[stride] = shade;
    data[stride + 1] = shade;
    data[stride + 2] = shade;
    data[stride + 3] = 255;
  }

  const texture = new DataTexture(data, texels, texels, RGBAFormat, UnsignedByteType);
  // Tagged as a color map. Pure black and white are fixed points of the sRGB transfer, so this
  // changes nothing on its own — it keeps the result correct once the material tints it.
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  // `DataTexture` already defaults both filters to nearest; stated explicitly because hard edges
  // are the entire point, and because `generateMipmaps` is off.
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;

  return texture;
};
