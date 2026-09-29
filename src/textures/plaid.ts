import {
  Color,
  ColorRepresentation,
  DataTexture,
  LinearMipmapLinearFilter,
  NearestFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";

/** One stripe of a sett: a run of `count` same-colored threads. */
export interface PlaidStripe {
  color: ColorRepresentation;
  /** Width of the stripe in threads. Rounded to a whole thread; stripes below one thread are dropped. */
  count: number;
}

/**
 * How the warp (vertical) and weft (horizontal) threads cross.
 *
 * - `twill` — 2/2 twill, the tartan weave: each thread passes over two and under two, stepping one
 *   thread per row, so every crossing shows *either* the warp or the weft color and the blend reads
 *   as a fine diagonal hatch.
 * - `plain` — 1/1 over-under, as in gingham or madras: the crossing becomes a tiny checker.
 * - `print` — no weave at all; crossings are the average of the two colors, like a printed plaid on
 *   flannel or paper.
 */
export type PlaidWeave = "twill" | "plain" | "print";

export interface PlaidTextureOptions {
  /**
   * The warp threadcount (vertical stripes, varying across U), as stripes in order. Required.
   *
   * With `symmetric` (the default), this is the *half-sett* in tartan notation: it is reflected
   * about its first and last stripes (the pivots), each of which appears once per repeat. So
   * `K4 R24 K24 Y4` weaves as `K4 R24 K24 Y4 K24 R24`, then repeats.
   */
  sett: PlaidStripe[];
  /**
   * The weft threadcount (horizontal stripes, varying along V). Defaults to `sett` — almost every
   * tartan is square. Set this for a non-square check such as a madras or a shirting.
   */
  weft?: PlaidStripe[];
  /**
   * Reflect each sett about its pivots, as a traditional tartan does. Defaults to `true`. Set to
   * `false` for an asymmetric sett, which simply repeats as written.
   */
  symmetric?: boolean;
  /** How the threads cross. Defaults to `"twill"`. */
  weave?: PlaidWeave;
  /**
   * Texels per thread. Defaults to `1`, the smallest image; raise it when a single repeat covers a
   * large surface and the weave should read close up.
   */
  threadSize?: number;
}

/** Expand a sett into one color per thread, reflected about its pivots when symmetric. */
const expandSett = (sett: PlaidStripe[], symmetric: boolean): Color[] => {
  const stripes = sett
    .map((stripe) => ({ color: new Color(stripe.color), count: Math.round(stripe.count) }))
    .filter((stripe) => stripe.count >= 1);
  if (stripes.length === 0) throw new Error("createPlaidTexture requires at least one stripe of one thread or more.");

  // Pivots (first and last) appear once; everything between them runs back in reverse.
  const sequence = symmetric && stripes.length > 2 ? [...stripes, ...stripes.slice(1, -1).reverse()] : stripes;

  const threads: Color[] = [];
  for (const stripe of sequence) {
    for (let i = 0; i < stripe.count; i++) threads.push(stripe.color);
  }
  return threads;
};

/**
 * Repeat the thread sequence until its length is a multiple of the weave's period. The weave
 * interlaces on `(x + y) % period`, so a sett that isn't a multiple would restart the diagonal
 * mid-cycle at the tile seam — the same parity trap as an odd checkerboard.
 */
const alignToWeave = (threads: Color[], period: number): Color[] => {
  let aligned = threads;
  while (aligned.length % period !== 0) aligned = aligned.concat(threads);
  return aligned;
};

/**
 * A woven plaid as a {@link DataTexture} — tartan, buffalo check, gingham, madras.
 *
 * The pattern is described the way a weaver writes it: a **sett** of colored stripes counted in
 * threads, run once as the warp (vertical) and once as the weft (horizontal), then interlaced by a
 * {@link PlaidWeave}. The texture is exactly one repeat and wraps seamlessly, so set `texture.repeat`
 * to tile it. Computed in plain JS, so no DOM — builds headless, on either renderer.
 *
 * Magnification is nearest, so up close every thread stays a crisp square; minification is
 * mipmapped, so far away the twill averages to the blended color cloth reads as, instead of
 * shimmering.
 *
 * @example
 * ```typescript
 * // A red-and-black buffalo check
 * const texture = createPlaidTexture({
 *   sett: [
 *     { color: 0xb01c24, count: 8 },
 *     { color: 0x151515, count: 8 },
 *   ],
 * });
 * texture.repeat.set(6, 6);
 *
 * const blanket = new Mesh(new PlaneGeometry(4, 4), new MeshStandardMaterial({ map: texture }));
 * ```
 */
export const createPlaidTexture = ({
  sett,
  weft = sett,
  symmetric = true,
  weave = "twill",
  threadSize = 1,
}: PlaidTextureOptions): DataTexture => {
  const period = weave === "twill" ? 4 : weave === "plain" ? 2 : 1;
  const warpThreads = alignToWeave(expandSett(sett, symmetric), period);
  const weftThreads = alignToWeave(expandSett(weft, symmetric), period);
  const texelsPerThread = Math.max(1, Math.round(threadSize));

  const width = warpThreads.length * texelsPerThread;
  const height = weftThreads.length * texelsPerThread;
  const data = new Uint8Array(width * height * 4);

  // Resolve every thread to sRGB bytes once; `getHex` returns sRGB regardless of the working space.
  const toBytes = (color: Color) => {
    const hex = color.getHex(SRGBColorSpace);
    return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255] as const;
  };
  const warpBytes = warpThreads.map(toBytes);
  const weftBytes = weftThreads.map(toBytes);

  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / texelsPerThread);
    const across = weftBytes[row]!;

    for (let x = 0; x < width; x++) {
      const column = Math.floor(x / texelsPerThread);
      const down = warpBytes[column]!;
      const stride = (y * width + x) * 4;

      if (weave === "print") {
        data[stride] = (down[0] + across[0]) / 2;
        data[stride + 1] = (down[1] + across[1]) / 2;
        data[stride + 2] = (down[2] + across[2]) / 2;
      } else {
        // Twill: warp over for two threads, under for two, shifted one thread per row — the
        // diagonal. Plain: over one, under one — a checker.
        const warpOver = weave === "twill" ? (column + row) % 4 < 2 : (column + row) % 2 === 0;
        const thread = warpOver ? down : across;
        data[stride] = thread[0];
        data[stride + 1] = thread[1];
        data[stride + 2] = thread[2];
      }
      data[stride + 3] = 255;
    }
  }

  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = NearestFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
};
