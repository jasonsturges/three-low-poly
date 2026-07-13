import { BoxGeometry, BufferGeometry, Color, ColorRepresentation, Material, Mesh, MeshStandardMaterial } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { WoodPicketGeometry, type WoodPicketGeometryOptions } from "../geometry/fence/WoodPicketGeometry";
import {
  WroughtIronPicketGeometry,
  type WroughtIronPicketGeometryOptions,
} from "../geometry/fence/WroughtIronPicketGeometry";

export interface FenceSpanOptions {
  /** Center-to-center picket spacing. Defaults to `0.4`. */
  pitch?: number;
  /** Number of pickets. Defaults to `10`. */
  count?: number;
  /** Target run length. Pickets divide it equally, overriding `pitch`. */
  length?: number;
  /**
   * Width of a single picket. Optional, but pass it whenever `length` is pinned: it is what stops a
   * request for more pickets than physically fit from producing an overlapping run. Defaults to `0`
   * (no limit).
   */
  itemWidth?: number;
}

/** A resolved fence run: every value concrete, mutually consistent. */
export interface FenceSpan {
  /** Center-to-center bar spacing. */
  pitch: number;
  /** Number of bars. */
  count: number;
  /** Total run length, always `count * pitch`. */
  length: number;
}

/**
 * Resolve a fence run from any two of `pitch`, `count`, and `length`.
 *
 * The three are bound by `length = count * pitch`, so pinning two solves the third:
 *
 * - `count` alone — the run is as long as it needs to be.
 * - `length` alone — pickets divide it equally; `pitch` is recomputed to land them on the span.
 * - both — `pitch` is whatever divides `length` into `count` pickets.
 *
 * A run spans `[0, length]` with pickets inset a half-pitch from each end. That inset is what puts a
 * run's end pickets a half-gap clear of the posts it sits between.
 *
 * Pinning `count` *and* `length` leaves only the gap to absorb the difference, and the gap has a
 * floor — pickets may touch, but they cannot overlap. Pass `itemWidth` and an impossible request
 * (more pickets than physically fit) yields on the count rather than producing intersecting
 * geometry. Read the returned `count` rather than assuming you got the one you asked for.
 *
 * @example
 * ```ts
 * resolveFenceSpan({ length: 4.2, pitch: 0.4 });
 * // → { count: 11, pitch: 0.3818…, length: 4.2 }
 *
 * // 20 planks of 0.35 need 7.0 of plank alone — they cannot fit in 6.
 * resolveFenceSpan({ length: 6, count: 20, itemWidth: 0.35 });
 * // → { count: 17, … }  the count yielded; nothing overlaps
 * ```
 */
export function resolveFenceSpan({ pitch = 0.4, count, length, itemWidth = 0 }: FenceSpanOptions = {}): FenceSpan {
  if (length !== undefined) {
    // Pinning both `count` and `length` leaves only the gap to absorb the difference — and the gap
    // has a floor, because pickets may touch but cannot overlap. When the request cannot be
    // honoured, the count yields: it is the only variable free to move.
    const fits = itemWidth > 0 ? Math.max(1, Math.floor(length / itemWidth)) : Infinity;
    const asked = count ?? Math.max(1, Math.round(length / pitch));
    const bars = Math.min(asked, fits);

    return { pitch: length / bars, count: bars, length };
  }

  const bars = count ?? 10;
  return { pitch, count: bars, length: bars * pitch };
}

export interface WroughtIronFenceOptions extends WroughtIronPicketGeometryOptions {
  /**
   * Clear air between adjacent pickets. Defaults to `0.3`.
   *
   * This is how fences are actually specced — and regulated: the gap, not the center-to-center
   * pitch, is what a building code constrains (a child's head mustn't pass through). Picket width
   * is a stock tubing size, so the gap is where the design lives. `pitch = width + gap`.
   */
  gap?: number;
  /** Number of pickets. The run is as long as they turn out. */
  count?: number;
  /** Target run length. Pickets divide it equally, adjusting the gap to land them on the span. */
  length?: number;
  /** Rail height. Defaults to `0.1`. */
  railHeight?: number;
  /** Rail thickness. Defaults to `0.05`. */
  railThickness?: number;
  /** Height of the lower rail's center. Defaults to `railHeight / 2`, resting on the ground. */
  lowerRailY?: number;
  /** Height of the upper rail's center. Defaults to `height - railHeight / 2`, tucked under the finials. */
  upperRailY?: number;
  /**
   * How far the rails run past each end of the picket span, to embed into a supporting post.
   * Defaults to `0` (rails flush with the run).
   *
   * Pickets and rails want opposite things at a post: pickets must *clear* it or they end up buried
   * in the stonework, while rails must *reach* it or they float unattached. A post whose profile
   * changes with height — a wide base, a narrower column, a wide cap — cannot satisfy both with one
   * extent. Size `length` to clear the post's widest part at picket height, then let `railOverhang`
   * carry the rails back in to meet the column.
   */
  railOverhang?: number;
  /** Iron material. Omit to build a flat-shaded standard material from `color`. */
  material?: Material;
  /** Iron tint when `material` is omitted. Defaults to `#2b2b2b`. */
  color?: ColorRepresentation;
}

/**
 * Wrought-iron fence run — evenly pitched pickets held by an upper and lower rail.
 *
 * The rails pass *through* the pickets, the way a real punched-channel rail does. (Its wood
 * counterpart, {@link createWoodPicketFence}, nails its stringers to the back instead.)
 *
 * Local frame: the picket span is `[0, length]` along +X, with pickets inset a half-pitch from each
 * end. That inset is what lets runs tile: butt one against the next and the pitch carries across the
 * seam unbroken, so a fence assembled from several runs reads as one continuous fence. Rails extend
 * to `[-railOverhang, length + railOverhang]`, which is how they reach into a supporting post.
 *
 * A run is a single merged {@link Mesh} — one geometry, one material, one draw call — so
 * `castShadow` and `clone()` work directly on it.
 *
 * The resolved {@link FenceSpan} is on `mesh.userData.span` — read `length` from it to place the
 * next run, or call {@link resolveFenceSpan} up front with the same options.
 *
 * Dispose the geometry and material when finished.
 *
 * There are three ways to ask for a run, and they differ in *what you are holding fixed*:
 *
 * @example
 * ```ts
 * // 1. BY COUNT — the run grows. You control how the pickets and gaps look; the fence is as long
 * //    as it needs to be. Reach for this when nothing constrains the length.
 * const fence = createWroughtIronFence({ count: 10, gap: 0.3 });
 * fence.userData.span.length; // 4.0 — however long 10 pickets came out
 *
 * // 2. BY LENGTH — the span is fixed and the count falls out. The gap flexes a hair so the
 * //    pickets land exactly on the span. Reach for this when the fence must fill an opening.
 * const fence = createWroughtIronFence({ length: 4.8, gap: 0.3 });
 * fence.userData.span.count; // 12
 * fence.userData.gap;        // 0.30 — nudged, if it had to be, to fit
 *
 * // 3. BY BOTH — pack an exact number of pickets into an exact span. `gap` is then an OUTPUT,
 * //    not an input: it is solved for, and whatever you passed is ignored.
 * const fence = createWroughtIronFence({ length: 4.8, count: 20 });
 * fence.userData.gap; // 0.14 — tighter, because 20 pickets must fit in 4.8
 * ```
 *
 * In every case the resolved truth is on `userData.span` and `userData.gap` — read them rather than
 * assuming you got what you asked for.
 */
export function createWroughtIronFence({
  gap = 0.3,
  count,
  length,
  height = 2.0,
  radius = 0.05,
  finialHeight = 0.3,
  finialRadius = 0.075,
  finialScaleZ = 1.0,
  radialSegments = 8,
  railHeight = 0.1,
  railThickness = 0.05,
  lowerRailY = railHeight / 2,
  upperRailY = height - railHeight / 2,
  railOverhang = 0.0,
  material,
  color = "#2b2b2b",
}: WroughtIronFenceOptions = {}): Mesh {
  // A picket's width is a stock tubing size; the gap is the design. Convert to pitch and the run
  // resolves exactly as the wood one does — same helper, same tiling, same by-count / by-length.
  const span = resolveFenceSpan({ pitch: radius * 2 + gap, count, length, itemWidth: radius * 2 });

  const picket = new WroughtIronPicketGeometry({
    height,
    radius,
    finialHeight,
    finialRadius,
    finialScaleZ,
    radialSegments,
  });

  const parts: BufferGeometry[] = [];

  for (let i = 0; i < span.count; i++) {
    const bar = picket.clone();
    bar.translate((i + 0.5) * span.pitch, 0, 0);
    parts.push(bar);
  }
  picket.dispose();

  // Rails run past the picket span at both ends so they can embed into a supporting post.
  const rail = new BoxGeometry(span.length + railOverhang * 2, railHeight, railThickness);

  for (const y of [lowerRailY, upperRailY]) {
    const bracing = rail.clone();
    bracing.translate(span.length / 2, y, 0);
    parts.push(bracing);
  }

  rail.dispose();

  const geometry = mergeGeometries(parts, false) as BufferGeometry;
  parts.forEach((part) => part.dispose());

  const iron = material ?? new MeshStandardMaterial({ color: new Color(color), flatShading: true });

  const fence = new Mesh(geometry, iron);
  fence.userData.span = span;
  fence.userData.gap = span.pitch - radius * 2;

  return fence;
}

export interface WoodPicketFenceOptions extends WoodPicketGeometryOptions {
  /**
   * Clear air between adjacent pickets. Defaults to `0.18`.
   *
   * A plank has real width, so the gap and the center-to-center pitch are different numbers:
   * `pitch = width + gap`. The gap is the one worth exposing — plank width is a lumber constant
   * (a 1×4 is 3.5" whatever you do), so the gap is where the design actually lives. Zero gap would
   * mean planks planed seamlessly together, which is a wall, not a fence.
   */
  gap?: number;
  /** Number of pickets. The run is as long as they turn out. */
  count?: number;
  /** Target run length. Pickets divide it equally, adjusting the gap to land them on the span. */
  length?: number;
  /** Stringer (horizontal rail) height. Defaults to `0.12`. */
  railHeight?: number;
  /** Stringer thickness. Defaults to `0.04`. */
  railThickness?: number;
  /** Height of the lower stringer's center. Defaults to `0.25`. */
  lowerRailY?: number;
  /** Height of the upper stringer's center. Defaults to `height - 0.25`. */
  upperRailY?: number;
  /** How far the stringers run past each end of the picket span, to reach a post. Defaults to `0`. */
  railOverhang?: number;
  /** Wood material. Omit to build a flat-shaded standard material from `color`. */
  material?: Material;
  /** Wood tint when `material` is omitted. Defaults to `#e8e4da`. */
  color?: ColorRepresentation;
}

/**
 * Wood picket fence run — pointed planks on two stringers.
 *
 * The iron fence's counterpart, and it differs in two ways that matter. Its spacing is specified as
 * the **gap** between planks rather than a center-to-center pitch, because a plank's width is a
 * lumber constant while the gap is the design choice. And its stringers sit **behind** the pickets
 * rather than intersecting them — nailed to the back, the way a real picket fence is built.
 *
 * Underneath it is the same run: `pitch = width + gap` feeds the same {@link resolveFenceSpan}.
 *
 * Local frame: the picket span is `[0, length]` along +X, planks inset a half-pitch from each end,
 * so runs tile with the gap carrying across the seam. Stringers sit behind, at -Z.
 *
 * Takes the same three forms as {@link createWroughtIronFence} — by count, by length, or both:
 *
 * @example
 * ```ts
 * // 1. BY COUNT — the run grows to fit 10 pickets.
 * const fence = createWoodPicketFence({ count: 10, gap: 0.18 });
 *
 * // 2. BY LENGTH — fill a 6-unit span; the count falls out and the gap flexes to land the planks.
 * const fence = createWoodPicketFence({ length: 6, gap: 0.18 });
 * fence.userData.span.count; // 11
 *
 * // 3. BY BOTH — pack exactly 20 planks into 6 units; `gap` becomes an output.
 * const fence = createWoodPicketFence({ length: 6, count: 20 });
 * fence.userData.gap; // solved
 * ```
 */
export function createWoodPicketFence({
  width = 0.35,
  height = 1.2,
  thickness = 0.04,
  pointHeight = 0.18,
  gap = 0.18,
  count,
  length,
  railHeight = 0.12,
  railThickness = 0.04,
  lowerRailY = 0.25,
  upperRailY = height - 0.25,
  railOverhang = 0.0,
  material,
  color = "#e8e4da",
}: WoodPicketFenceOptions = {}): Mesh {
  // A plank's width is fixed; the gap is what flexes. Convert to pitch and the run resolves exactly
  // as the iron one does — same helper, same tiling, same by-count / by-length behavior.
  const span = resolveFenceSpan({ pitch: width + gap, count, length, itemWidth: width });

  const picket = new WoodPicketGeometry({ width, height, thickness, pointHeight });

  const parts: BufferGeometry[] = [];

  for (let i = 0; i < span.count; i++) {
    const plank = picket.clone();
    plank.translate((i + 0.5) * span.pitch, 0, 0);
    parts.push(plank);
  }
  picket.dispose();

  // Stringers sit behind the pickets, not through them.
  const railZ = -(thickness / 2 + railThickness / 2);
  // `ExtrudeGeometry` is non-indexed while `BoxGeometry` is indexed, and `mergeGeometries` refuses
  // to mix the two — drop the rails' index so every part matches the pickets.
  const rail = new BoxGeometry(span.length + railOverhang * 2, railHeight, railThickness).toNonIndexed();

  for (const y of [lowerRailY, upperRailY]) {
    const stringer = rail.clone();
    stringer.translate(span.length / 2, y, railZ);
    parts.push(stringer);
  }
  rail.dispose();

  const geometry = mergeGeometries(parts, false) as BufferGeometry;
  parts.forEach((part) => part.dispose());

  const wood = material ?? new MeshStandardMaterial({ color: new Color(color), flatShading: true });

  const fence = new Mesh(geometry, wood);
  fence.userData.span = span;
  fence.userData.gap = span.pitch - width;

  return fence;
}
