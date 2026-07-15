import {
  BufferGeometry,
  Color,
  ColorRepresentation,
  Euler,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { CelticCrossHeadstoneGeometry } from "../geometry/cemetery/CelticCrossHeadstoneGeometry";
import { CrossHeadstoneGeometry } from "../geometry/cemetery/CrossHeadstoneGeometry";
import { ObeliskGeometry } from "../geometry/cemetery/ObeliskGeometry";
import { ObeliskHeadstoneGeometry } from "../geometry/cemetery/ObeliskHeadstoneGeometry";
import { RoundedHeadstoneGeometry } from "../geometry/cemetery/RoundedHeadstoneGeometry";
import { SquareHeadstoneGeometry } from "../geometry/cemetery/SquareHeadstoneGeometry";
import { ArchStyle } from "../shapes/ArchProfile";
import { createRandom } from "../utils/Random";

/**
 * One kind of stone in the row's palette.
 *
 * The `rounded` family is where the variety lives — it is an arched slab, so it takes the whole
 * {@link ArchStyle} vocabulary plus a narrower `archWidth` for the shouldered look (an arch sitting *on*
 * the slab). `cross`, `obelisk` (a tapered monument) and `obeliskHeadstone` (a stepped one) are single
 * silhouettes. Every style carries a `weight` — its relative frequency in the row.
 */
export type HeadstoneStyle =
  | { kind: "rounded"; arch?: ArchStyle; archWidth?: number; archHeight?: number; weight?: number }
  | { kind: "square"; weight?: number }
  | { kind: "cross"; weight?: number }
  | { kind: "celticCross"; weight?: number }
  | { kind: "obelisk"; weight?: number }
  | { kind: "obeliskHeadstone"; weight?: number };

/**
 * The stock cemetery: mostly plain rounded and square stones, the occasional cross, and obelisks that
 * stand out because they are fewer. The rounded family dominates and fans into four tops — a full-width
 * semicircle, a shouldered one, a gently curved segmental, and a gothic point.
 *
 * These are relative weights, not counts: a row draws from them, so the mix holds at any `count`.
 */
export const DEFAULT_HEADSTONE_STYLES: readonly HeadstoneStyle[] = [
  { kind: "rounded", arch: "semicircle", weight: 6 },
  { kind: "rounded", arch: "semicircle", archWidth: 0.42, weight: 4 }, // shouldered — arch sits ON the slab
  { kind: "rounded", arch: "segmental", archHeight: 0.16, weight: 4 }, // a gentle curve, not a full round
  { kind: "rounded", arch: "pointed", archHeight: 0.5, weight: 2 }, // gothic
  { kind: "rounded", arch: "ogee", archHeight: 0.26, weight: 1 }, // a low ogee flourish — rare
  { kind: "square", weight: 4 },
  { kind: "cross", weight: 2 },
  { kind: "celticCross", weight: 2 }, // the gothic flourish — flared arms and a nimbus
  { kind: "obeliskHeadstone", weight: 2 }, // the stepped one — the everyday obelisk marker
  { kind: "obelisk", weight: 1 }, // the tall tapered monument — rarer, so it stands out
];

/** Everything that ages a stone — shared by a single {@link rowOfHeadstones} and a whole {@link fieldOfHeadstones}. */
export interface HeadstoneSettleOptions {
  /** Optional seed for a reproducible layout. Omit for unique per runtime. */
  seed?: number;
  /** Max lean off vertical, in radians, on both X and Z. Defaults to `0.12` (~7°). */
  leanMax?: number;
  /** Max twist about Y, in radians. Keep it small — a turned stone reads as settled, not knocked over. Defaults to `0.4`. */
  twistMax?: number;
  /**
   * How the twist is distributed within `±twistMax`, via {@link RandomSource.skewCenter}. Defaults to
   * `1.6`.
   *
   * `1` is uniform — every angle equally likely, so half the stones are dramatically turned. Higher pulls
   * most stones toward straight while still letting the occasional one reach the full `twistMax`, so a
   * hard-turned stone reads as the exception it should be, not the rule.
   */
  twistBias?: number;
  /**
   * Max *additional* depth a stone settles into the ground, beyond whatever its lean already
   * demands. Stones only ever sink, never rise. Defaults to `0.08`.
   *
   * Leaning is not free: a stone pivots about its base, so tilting lifts one edge of its footing out
   * of the earth. That much burial is compulsory — it is what the geometry costs. This is the depth
   * the stone has settled *on top of* it, so the two stay independent and a hard-leaning stone still
   * sinks as deep as an upright one.
   */
  sinkMax?: number;
  /** Max lateral drift off the plot center, on X and Z. Defaults to `0.05`. */
  driftMax?: number;
  /** Min uniform scale. Defaults to `0.85`. */
  scaleMin?: number;
  /** Max uniform scale. Defaults to `1.2`. */
  scaleMax?: number;
  /** Base stone tint. Defaults to `#777777`. */
  color?: ColorRepresentation;
  /** How far each stone weathers off the base tint, in lightness. `0` makes them identical. Defaults to `0.09`. */
  weathering?: number;
  /** Stone material. Omit to build a flat-shaded standard material from `color`. */
  material?: Material;
  /**
   * The palette the row draws from. Defaults to {@link DEFAULT_HEADSTONE_STYLES}.
   *
   * Pass your own to reshape the graveyard — `[{ kind: "cross" }]` for a war plot, all-`rounded` with
   * one `arch` for a uniform churchyard. Weights are relative; omit `weight` for `1`.
   */
  styles?: readonly HeadstoneStyle[];
}

export interface HeadstoneRowOptions extends HeadstoneSettleOptions {
  /** Number of plots. Defaults to `8`. */
  count?: number;
  /**
   * Plot pitch — center to center along the row. Defaults to `1`.
   *
   * A cemetery is surveyed on a uniform grid, so the *plot* is what repeats, not the gap. Headstones
   * vary wildly in width (a cross is 0.4, an obelisk 0.75), so spacing them by a fixed gap would put
   * their centers at irregular intervals — and a row of graves reads by its plot rhythm. Irregular
   * centers do not look aged; they look wrong.
   */
  spacing?: number;
}

export interface HeadstoneFieldOptions extends HeadstoneSettleOptions {
  /** Plots across each row — the X axis. Defaults to `10`. */
  columns?: number;
  /** Number of rows, front to back — the Z axis. Defaults to `10`. */
  rows?: number;
  /** Plot pitch ACROSS a row — the plot's width. Defaults to `1`. */
  spacing?: number;
  /**
   * Plot pitch BETWEEN rows — the plot's length. Defaults to `2.2`.
   *
   * A grave is longer than it is wide, so a cemetery's rows sit further apart than the stones within a
   * row. Leave this at the default and the field reads as real surveyed plots rather than a square grid.
   */
  rowSpacing?: number;
  /**
   * Fraction of plots that actually hold a stone, `0`–`1`. Defaults to `1` (every plot filled).
   *
   * Below `1`, plots are left empty at random — the gaps of an old churchyard where stones were never
   * cut or have since been lost. It is also what a sparse, distant fill wants: a thin scatter of stones
   * rather than a solid block.
   */
  density?: number;
}

/** The geometry a style builds, and the footprint a lean has to lift out of the ground. */
interface Variant {
  geometry: BufferGeometry;
  weight: number;
  halfWidth: number;
  halfDepth: number;
}

function styleGeometry(style: HeadstoneStyle): BufferGeometry {
  switch (style.kind) {
    case "rounded":
      return new RoundedHeadstoneGeometry({
        arch: style.arch,
        archWidth: style.archWidth,
        archHeight: style.archHeight,
      });
    case "square":
      return new SquareHeadstoneGeometry();
    case "cross":
      return new CrossHeadstoneGeometry();
    case "celticCross":
      return new CelticCrossHeadstoneGeometry();
    case "obelisk":
      return new ObeliskGeometry();
    case "obeliskHeadstone":
      return new ObeliskHeadstoneGeometry();
  }
}

function buildPalette(styles: readonly HeadstoneStyle[]): Variant[] {
  return styles.map((style) => {
    const geometry = styleGeometry(style);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;

    return {
      geometry,
      weight: Math.max(0, style.weight ?? 1),
      halfWidth: Math.max(Math.abs(box.min.x), Math.abs(box.max.x)),
      halfDepth: Math.max(Math.abs(box.min.z), Math.abs(box.max.z)),
    };
  });
}

/** One settled stone — which silhouette it is, where it ended up, and the shade it weathered to. */
interface Plot {
  variant: number;
  matrix: Matrix4;
  tint: Color;
}

/** Resolved aging knobs — defaults applied once, then handed to every stone. */
interface Settle {
  leanMax: number;
  twistMax: number;
  twistBias: number;
  sinkMax: number;
  driftMax: number;
  scaleMin: number;
  scaleMax: number;
  weathering: number;
  base: Color;
}

// Reused across every stone in a layout — synchronous, so scratch is safe.
const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();
const _rotation = new Euler();

/**
 * Draw and age ONE stone at a plot center — the atomic unit a row and a field both repeat.
 *
 * This is the shared base. A row and a field differ only in where they put the plot centers; each
 * center still gets a stone the same way. It advances `source` in a fixed order, so a given seed lays
 * out the same graveyard every time, and the same first stones whether the layout is a row or a field.
 *
 * A stone **sinks but never rises**. Leaning is not free: a stone pivots about its base, so tilting
 * lifts one edge of its footing clear of the ground, and burying it that far is compulsory. `sinkMax`
 * is the settling *on top of* that, which keeps the two independent — a hard-leaning stone still sinks
 * as deep as an upright one, rather than being pinned at whatever depth its lean forced.
 */
function settleStone(
  source: ReturnType<typeof createRandom>,
  variants: Variant[],
  indices: number[],
  weights: number[],
  x: number,
  z: number,
  s: Settle,
): Plot {
  const variant = source.weighted(indices, weights);
  const { halfWidth, halfDepth } = variants[variant]!;

  const uniform = source.float(s.scaleMin, s.scaleMax);
  const leanX = source.float(-s.leanMax, s.leanMax);
  const leanZ = source.float(-s.leanMax, s.leanMax);

  const lifted =
    halfWidth * uniform * Math.abs(Math.sin(leanZ)) + halfDepth * uniform * Math.abs(Math.sin(leanX));
  const sink = lifted + source.float(0, s.sinkMax);

  _rotation.set(leanX, source.skewCenter(s.twistBias, -s.twistMax, s.twistMax), leanZ, "YXZ");
  _quaternion.setFromEuler(_rotation);
  _position.set(x + source.float(-s.driftMax, s.driftMax), -sink, z + source.float(-s.driftMax, s.driftMax));
  _scale.setScalar(uniform);

  const tint = s.base.clone().offsetHSL(
    source.float(-s.weathering * 0.4, s.weathering * 0.4),
    source.float(-s.weathering * 0.2, s.weathering * 0.3),
    source.float(-s.weathering, s.weathering * 0.6),
  );

  return { variant, matrix: new Matrix4().compose(_position, _quaternion, _scale), tint };
}

/**
 * Group the settled plots into one {@link InstancedMesh} PER SILHOUETTE — the whole reason a field is
 * cheap. Ten thousand stones drawn from an eight-style palette are eight draw calls, not ten thousand,
 * because every plot of a given style shares one instanced mesh regardless of which row it sits in.
 */
function instancePlots(variants: Variant[], plots: Plot[], material: Material): Group {
  const group = new Group();

  variants.forEach((variant, index) => {
    const mine = plots.filter((plot) => plot.variant === index);
    if (mine.length === 0) {
      variant.geometry.dispose();
      return;
    }

    const mesh = new InstancedMesh(variant.geometry, material, mine.length);
    mine.forEach((plot, i) => {
      mesh.setMatrixAt(i, plot.matrix);
      mesh.setColorAt(i, plot.tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    group.add(mesh);
  });

  return group;
}

/** Lay stones on a set of plot centers and instance them — the common tail of a row and a field. */
function layStones(
  centers: { x: number; z: number }[],
  {
    seed,
    leanMax = 0.12,
    twistMax = 0.4,
    twistBias = 1.6,
    sinkMax = 0.08,
    driftMax = 0.05,
    scaleMin = 0.85,
    scaleMax = 1.2,
    color = "#777777",
    weathering = 0.09,
    material,
    styles = DEFAULT_HEADSTONE_STYLES,
    density = 1,
  }: HeadstoneSettleOptions & { density?: number },
): Group {
  const source = createRandom(seed);
  const variants = buildPalette(styles);
  const indices = variants.map((_, i) => i);
  const weights = variants.map((variant) => variant.weight);
  const settle: Settle = { leanMax, twistMax, twistBias, sinkMax, driftMax, scaleMin, scaleMax, weathering, base: new Color(color) };

  const stone =
    material ?? new MeshStandardMaterial({ color: new Color(color), roughness: 0.9, flatShading: true });

  // Draw every stone up front so each silhouette's instance count is known before its mesh is built.
  const plots: Plot[] = [];
  for (const center of centers) {
    // An empty plot: rolled only when density < 1, so a full layout draws the exact same sequence a
    // seed always did.
    if (density < 1 && source.next() >= density) continue;
    plots.push(settleStone(source, variants, indices, weights, center.x, center.z, settle));
  }

  return instancePlots(variants, plots, stone);
}

/**
 * A row of headstones that has been standing for a hundred years.
 *
 * Perfectly upright, perfectly aligned stones read as *brand new* — which is exactly wrong for a
 * graveyard. Age is the point here, so each stone is drawn from a random silhouette, then settled by
 * {@link settleStone}: it leans, twists a little, sinks, drifts off its plot, and weathers to its own
 * shade of gray.
 *
 * Returns a {@link Group} of {@link InstancedMesh}es — one per silhouette used. The first plot sits at
 * the origin and the row runs out along `+x`; position the group to place it. For many rows at once, see
 * {@link fieldOfHeadstones}, which shares its instancing so the whole field stays a handful of draw
 * calls. Dispose each child's geometry and the shared material when removing it.
 *
 * @example
 * ```ts
 * const row = rowOfHeadstones({ count: 8, spacing: 1, seed: 1337 });
 * scene.add(row);
 *
 * // A newer plot: upright, evenly set, barely weathered.
 * const fresh = rowOfHeadstones({ count: 8, leanMax: 0.01, sinkMax: 0, weathering: 0.02 });
 * ```
 */
export function rowOfHeadstones({ count = 8, spacing = 1, ...settle }: HeadstoneRowOptions = {}): Group {
  const centers = Array.from({ length: count }, (_, i) => ({ x: i * spacing, z: 0 }));
  return layStones(centers, settle);
}

/**
 * A whole graveyard — a grid of rows, aged the same way a single {@link rowOfHeadstones} is.
 *
 * **It is the row's instancing, shared across every row.** Call `rowOfHeadstones` once per row and each
 * call builds its own instanced meshes, so a 10×10 field costs ten rows × a mesh-per-style ≈ eighty draw
 * calls. This lays every plot up front and instances them together: one mesh per silhouette for the
 * *entire field*, so a hundred stones — or ten thousand — stay the same handful of draw calls. That is
 * the whole reason to reach for it over a loop.
 *
 * The grid gives the structure a surveyed cemetery has; the per-stone settling ({@link settleStone})
 * gives the age that keeps it from reading as a spreadsheet. `density` below `1` thins it to the gappy
 * scatter of an old churchyard — or of a sparse fill trailing off into the distance.
 *
 * The first plot sits at the origin; the field runs out along `+x` (`columns`) and `+z` (`rows`). Its
 * extent is `(columns − 1) · spacing` by `(rows − 1) · rowSpacing`, so center it with
 * `field.position.set(-width / 2, 0, -depth / 2)`.
 *
 * @example
 * ```ts
 * const graveyard = fieldOfHeadstones({ columns: 10, rows: 10, seed: 1337 });
 * scene.add(graveyard);
 *
 * // A thin, weathered scatter for the distance — still one handful of draw calls at any size.
 * const distant = fieldOfHeadstones({ columns: 40, rows: 40, density: 0.35, weathering: 0.14 });
 * ```
 */
export function fieldOfHeadstones({
  columns = 10,
  rows = 10,
  spacing = 1,
  rowSpacing = 2.2,
  density = 1,
  ...settle
}: HeadstoneFieldOptions = {}): Group {
  const centers: { x: number; z: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      centers.push({ x: column * spacing, z: row * rowSpacing });
    }
  }
  return layStones(centers, { ...settle, density });
}
