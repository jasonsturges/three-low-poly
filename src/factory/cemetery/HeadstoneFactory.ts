import {
  type BufferGeometry,
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
import { breakHeadstone, ROW_HEADSTONES, type HeadstoneEntry } from "../../geometry/cemetery/headstoneCatalog";
import type { ColorSampler } from "../../utils/RandomColor";
import { createRandom, deriveSubSeed } from "../../utils/Random";

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
  /** Legacy HSL tint spread around the base color. `0` makes them identical. Defaults to `0.09`. */
  weathering?: number;
  /** Overrides color/weathering. Index counts retained stones before grouping by silhouette.
   * Uses an independent seeded stream. The generated material is white; supplied materials still multiply the tint. */
  colors?: ColorSampler;
  /** Stone material. Omit for a flat-shaded standard material: white with `colors`, otherwise tinted by `color`. */
  material?: Material;
  /**
   * The stones the row draws from, by their catalogue weights. Defaults to {@link ROW_HEADSTONES} — every
   * tablet, cross and obelisk in {@link HEADSTONE_CATALOG}.
   *
   * Pass a slice of the catalogue to reshape the graveyard — the crosses alone for a war plot, one tablet
   * for a uniform churchyard. Re-weight by mapping: `catalog.map((e) => ({ ...e, weight: 1 }))`.
   *
   * Each entry is built ONCE, the first time it is drawn, and every stone of it is an instance — so a big
   * catalogue costs variety, not geometry.
   */
  catalog?: readonly HeadstoneEntry[];
  /**
   * Fraction of TABLETS found snapped across — the stump standing, the top lying on its back in front of
   * it. `0` for an intact yard. Defaults to `0.05`.
   */
  broken?: number;
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

/** A catalogue entry once built: its geometry, and the footprint a lean has to lift out of the ground. */
interface Variant {
  geometry: BufferGeometry;
  halfWidth: number;
  halfDepth: number;
}

function measure(geometry: BufferGeometry): Variant {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return {
    geometry,
    halfWidth: Math.max(Math.abs(box.min.x), Math.abs(box.max.x)),
    halfDepth: Math.max(Math.abs(box.min.z), Math.abs(box.max.z)),
  };
}

/** One settled stone — which geometry it is, where it ended up, and the shade it weathered to. */
interface Plot {
  /** The geometry's key: a catalogue name, or that name's broken `#stump` / `#top`. */
  key: string;
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
 * Age ONE stone at a plot center — the atomic unit a row and a field both repeat.
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
  { halfWidth, halfDepth }: Variant,
  x: number,
  z: number,
  s: Settle,
): { matrix: Matrix4; tint: Color; yaw: number; scale: number } {
  const uniform = source.float(s.scaleMin, s.scaleMax);
  const leanX = source.float(-s.leanMax, s.leanMax);
  const leanZ = source.float(-s.leanMax, s.leanMax);

  const lifted = halfWidth * uniform * Math.abs(Math.sin(leanZ)) + halfDepth * uniform * Math.abs(Math.sin(leanX));
  const sink = lifted + source.float(0, s.sinkMax);

  const yaw = source.skewCenter(s.twistBias, -s.twistMax, s.twistMax);
  _rotation.set(leanX, yaw, leanZ, "YXZ");
  _quaternion.setFromEuler(_rotation);
  _position.set(x + source.float(-s.driftMax, s.driftMax), -sink, z + source.float(-s.driftMax, s.driftMax));
  _scale.setScalar(uniform);

  const tint = s.base
    .clone()
    .offsetHSL(
      source.float(-s.weathering * 0.4, s.weathering * 0.4),
      source.float(-s.weathering * 0.2, s.weathering * 0.3),
      source.float(-s.weathering, s.weathering * 0.6),
    );

  return { matrix: new Matrix4().compose(_position, _quaternion, _scale), tint, yaw, scale: uniform };
}

/**
 * The fallen top of a broken stone: in front of its stump along the stone's facing, on its back, turned a
 * little from square — resting on its own thickness.
 */
function fallenTop(source: ReturnType<typeof createRandom>, top: Variant, x: number, z: number, yaw: number, scale: number): Matrix4 {
  const reach = source.float(0.5, 0.8) * scale;
  _rotation.set(-Math.PI / 2 + source.float(-0.1, 0.12), yaw + source.float(-0.5, 0.5), source.float(-0.08, 0.08), "YXZ");
  _quaternion.setFromEuler(_rotation);
  _position.set(x + Math.sin(yaw) * reach, top.halfDepth * scale * 0.9, z + Math.cos(yaw) * reach);
  _scale.setScalar(scale);
  return new Matrix4().compose(_position, _quaternion, _scale);
}

/**
 * Group the settled plots into one {@link InstancedMesh} PER GEOMETRY — the whole reason a field is cheap.
 * Ten thousand stones drawn from a thirty-stone catalogue are at most thirty draw calls (plus the broken
 * ones), because every plot of a given stone shares one instanced mesh regardless of which row it sits in.
 */
function instancePlots(variants: Map<string, Variant>, plots: Plot[], material: Material): Group {
  const group = new Group();

  for (const [key, variant] of variants) {
    const mine = plots.filter((plot) => plot.key === key);
    if (mine.length === 0) {
      variant.geometry.dispose();
      continue;
    }

    const mesh = new InstancedMesh(variant.geometry, material, mine.length);
    mesh.name = key;
    mine.forEach((plot, i) => {
      mesh.setMatrixAt(i, plot.matrix);
      mesh.setColorAt(i, plot.tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    group.add(mesh);
  }

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
    colors,
    material,
    catalog = ROW_HEADSTONES,
    broken = 0.05,
    density = 1,
  }: HeadstoneSettleOptions & { density?: number },
): Group {
  const source = createRandom(seed);
  const colorContext = { index: 0, random: createRandom(seed === undefined ? undefined : deriveSubSeed(seed, 0x73746f6e)) };
  //  Breakage draws from its own stream, so turning it up or down never moves a standing stone.
  const breakage = createRandom(seed === undefined ? undefined : deriveSubSeed(seed, 0x62726b6e));
  const entries = catalog.filter((entry) => entry.weight > 0);
  if (entries.length === 0) return new Group();
  const weights = entries.map((entry) => entry.weight);
  const settle: Settle = {
    leanMax,
    twistMax,
    twistBias,
    sinkMax,
    driftMax,
    scaleMin,
    scaleMax,
    weathering,
    base: new Color(color),
  };

  //  Built on first draw: a stone the dice never pick costs nothing.
  const variants = new Map<string, Variant>();
  const variant = (entry: HeadstoneEntry): Variant => {
    let v = variants.get(entry.name);
    if (!v) variants.set(entry.name, (v = measure(entry.build())));
    return v;
  };
  const brokenVariants = (entry: HeadstoneEntry): { stump: string; top: Variant } => {
    const stump = `${entry.name}#stump`;
    const top = `${entry.name}#top`;
    if (!variants.has(stump)) {
      const pieces = breakHeadstone(variant(entry).geometry);
      variants.set(stump, measure(pieces.stump));
      variants.set(top, measure(pieces.top));
    }
    return { stump, top: variants.get(top)! };
  };

  const stone =
    material ?? new MeshStandardMaterial({ color: new Color(colors ? 0xffffff : color), roughness: 0.9, flatShading: true });

  // Draw every stone up front so each geometry's instance count is known before its mesh is built.
  const plots: Plot[] = [];
  for (const center of centers) {
    // An empty plot: rolled only when density < 1, so a full layout draws the exact same sequence a
    // seed always did.
    if (density < 1 && source.next() >= density) continue;
    const entry = source.weighted(entries, weights);
    const settled = settleStone(source, variant(entry), center.x, center.z, settle);
    if (colors) {
      colorContext.index = plots.length;
      colors(settled.tint, colorContext);
    }
    if (entry.family === "tablet" && broken > 0 && breakage.next() < broken) {
      const { stump, top } = brokenVariants(entry);
      plots.push({ key: stump, matrix: settled.matrix, tint: settled.tint });
      const fallen = fallenTop(breakage, top, center.x, center.z, settled.yaw, settled.scale);
      plots.push({ key: `${entry.name}#top`, matrix: fallen, tint: settled.tint.clone() });
    } else {
      plots.push({ key: entry.name, matrix: settled.matrix, tint: settled.tint });
    }
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
