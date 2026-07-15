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
  { kind: "square", weight: 4 },
  { kind: "cross", weight: 2 },
  { kind: "celticCross", weight: 2 }, // the gothic flourish — flared arms and a nimbus
  { kind: "obeliskHeadstone", weight: 2 }, // the stepped one — the everyday obelisk marker
  { kind: "obelisk", weight: 1 }, // the tall tapered monument — rarer, so it stands out
];

export interface HeadstoneRowOptions {
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
  /** Optional seed for a reproducible row. Omit for unique per runtime. */
  seed?: number;
  /** Max lean off vertical, in radians, on both X and Z. Defaults to `0.12` (~7°). */
  leanMax?: number;
  /** Max twist about Y, in radians. Keep it small — a turned stone reads as settled, not knocked over. Defaults to `0.4`. */
  twistMax?: number;
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

/**
 * A row of headstones that has been standing for a hundred years.
 *
 * Perfectly upright, perfectly aligned stones read as *brand new* — which is exactly wrong for a
 * graveyard. Age is the point here, so each stone is drawn from a random silhouette, then settled:
 * it leans, twists a little, sinks, drifts off its plot, and weathers to its own shade of gray.
 *
 * Stones **sink but never rise** — a stone standing proud of the earth looks placed, not buried. And
 * leaning is not free: a stone pivots about its base, so tilting lifts one edge of its footing out
 * of the earth, and that much burial is compulsory. `sinkMax` is the depth a stone settles *on top
 * of* what its lean already cost, which keeps the two independent — a hard-leaning stone still sinks
 * as deep as an upright one, instead of being pinned at whatever depth its lean happened to force.
 *
 * Returns a {@link Group} of {@link InstancedMesh}es — one per silhouette, so a row of forty stones
 * is four draw calls. Weathering rides on per-instance color. Dispose each child's geometry and the
 * shared material when removing it.
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
export function rowOfHeadstones({
  count = 8,
  spacing = 1,
  seed,
  leanMax = 0.12,
  twistMax = 0.4,
  sinkMax = 0.08,
  driftMax = 0.05,
  scaleMin = 0.85,
  scaleMax = 1.2,
  color = "#777777",
  weathering = 0.09,
  material,
  styles = DEFAULT_HEADSTONE_STYLES,
}: HeadstoneRowOptions = {}): Group {
  const source = createRandom(seed);
  const variants = buildPalette(styles);
  const indices = variants.map((_, i) => i);
  const weights = variants.map((variant) => variant.weight);

  const stone =
    material ?? new MeshStandardMaterial({ color: new Color(color), roughness: 0.9, flatShading: true });

  // Draw every stone up front so each variant's instance count is known before its mesh is built.
  const plots: { variant: number; matrix: Matrix4; tint: Color }[] = [];

  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const rotation = new Euler();
  const base = new Color(color);

  for (let i = 0; i < count; i++) {
    const variant = source.weighted(indices, weights);
    const { halfWidth, halfDepth } = variants[variant]!;

    const uniform = source.float(scaleMin, scaleMax);
    const leanX = source.float(-leanMax, leanMax);
    const leanZ = source.float(-leanMax, leanMax);

    // A stone pivots about its base, so leaning lifts one edge of its footing clear of the ground.
    // Burying it that far is compulsory — it is what the lean costs. Settling is then *additional*
    // depth on top, which keeps the two independent: a hard-leaning stone still sinks as deep into
    // the earth as an upright one, rather than being pinned at the depth its lean happened to force.
    const lifted =
      halfWidth * uniform * Math.abs(Math.sin(leanZ)) + halfDepth * uniform * Math.abs(Math.sin(leanX));
    const sink = lifted + source.float(0, sinkMax);

    rotation.set(leanX, source.float(-twistMax, twistMax), leanZ, "YXZ");
    quaternion.setFromEuler(rotation);
    position.set(i * spacing + source.float(-driftMax, driftMax), -sink, source.float(-driftMax, driftMax));
    scale.setScalar(uniform);

    const tint = base.clone().offsetHSL(
      source.float(-weathering * 0.4, weathering * 0.4),
      source.float(-weathering * 0.2, weathering * 0.3),
      source.float(-weathering, weathering * 0.6),
    );

    plots.push({ variant, matrix: new Matrix4().compose(position, quaternion, scale), tint });
  }

  // One InstancedMesh per silhouette actually used.
  const group = new Group();

  variants.forEach((variant, index) => {
    const mine = plots.filter((plot) => plot.variant === index);
    if (mine.length === 0) {
      variant.geometry.dispose();
      return;
    }

    const mesh = new InstancedMesh(variant.geometry, stone, mine.length);
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
