import { BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { WallOpeningOptions } from "../../shapes/WallShape";
import { circleProfile } from "../../sweep/Profiles";
import type { Vec2 } from "../../utils/GeometryBuffers";
import { buildLatticeBars, openingBoundary } from "./latticeBars";

export interface GregorianLatticeGeometryOptions {
  /**
   * The opening the lattice fills. The SAME description a wall is punched with, a
   * {@link WindowFrameGeometry} rings, and a {@link PaneGeometry} glazes.
   *
   * Any arch, including `square`. **A rectangular Gregorian light needs no cutting at all** — every
   * boundary a bar meets is perpendicular to it, so a square end is already correct. Put the same lattice
   * under an ARCH and the mullions run into a curve, and the ends have to follow it. Both cases are this
   * one geometry.
   */
  opening?: WallOpeningOptions;
  /** Distance between neighbouring MULLIONS — the upright bars. Defaults to `0.24`. */
  mullionSpacing?: number;
  /** Distance between neighbouring TRANSOMS — the level bars. Defaults to `0.3`. */
  transomSpacing?: number;
  /**
   * Slides the mullions across the opening. Defaults to `0`, which puts one on the centreline.
   *
   * Half a spacing puts a LIGHT on the centreline instead, which is what an even number of lights wants.
   * {@link GregorianLatticeWindow} works this out from the light counts.
   */
  mullionPhase?: number;
  /** Slides the transoms up the opening. Defaults to `0`, which puts one on the sill line. */
  transomPhase?: number;
  /** Width of the bar across the glass. Defaults to `0.03`. */
  barWidth?: number;
  /** Depth of the bar through the glass. Defaults to `barWidth`, a square section. */
  barDepth?: number;
  /** Sides on the bar's section — the low-poly knob. `4` is square stock. Defaults to `4`. */
  barSides?: number;
  /** How finely the arch is followed. Defaults to `20`. */
  curveSegments?: number;
}

/**
 * Gregorian lattice — upright MULLIONS and level TRANSOMS dividing an opening into rectangular lights.
 *
 * The sibling of {@link DiamondLatticeGeometry}, and the same construction underneath: **a lattice type is
 * only ever a choice of angles.** A diamond is two families at `±45°`; this is two families at `90°` and
 * `0°`. Both hand their families to the same bar builder, so neither knows what the other is making.
 *
 * **No miters here, and none wanted.** Mullion crosses transom, and an X-junction has no bisector to
 * share — real glazing bars are halved into each other or simply butted, and interpenetration is the
 * honest model. What the bars DO need is their ends cut to the boundary, which is a different thing: in a
 * square opening every boundary is perpendicular to the bar meeting it, so a square end is already right
 * and nothing happens; under an arch the mullions run into a curve, and the ends follow it.
 *
 * Bars that would lie ON the boundary — a transom on the sill line, a mullion on a jamb — are dropped by
 * the same rule that drops offcuts, since their section straddles the edge. The frame occupies those
 * positions.
 *
 * Baked to a single `BufferGeometry` — one draw call for the whole lattice.
 *
 * Drawn at the ORIGIN — centred on X, sill at `y = 0` — so it lands on a frame and a pane built from the
 * same opening. Material groups: none.
 *
 * @example
 * ```ts
 * const opening = { width: 1.2, height: 1.6, arch: "semicircle" } as const;
 *
 * const bars = new Mesh(new GregorianLatticeGeometry({ opening }), painted);
 * ```
 */
export class GregorianLatticeGeometry extends BufferGeometry {
  /** How many bars were built. Offcuts and bars lying on the boundary are dropped, so this is not derivable. */
  readonly barCount: number;

  constructor({
    opening = {},
    mullionSpacing = 0.24,
    transomSpacing = 0.3,
    mullionPhase = 0,
    transomPhase = 0,
    barWidth = 0.03,
    barDepth = barWidth,
    barSides = 4,
    curveSegments = 20,
  }: GregorianLatticeGeometryOptions = {}) {
    super();

    const boundary = openingBoundary(opening, curveSegments);

    // `circleProfile` is a regular polygon, so it is square by construction. Scaling the axis that maps to
    // the frame's NORMAL — the one running through the glass — makes it rectangular without touching the
    // axis the cutting reads.
    const depthScale = barWidth > 0 ? barDepth / barWidth : 1;
    const profile = circleProfile(barWidth / 2, Math.max(3, Math.round(barSides))).map(
      ([px, py]) => [px * depthScale, py] as Vec2,
    );

    const parts = buildLatticeBars(
      boundary,
      [
        // 90° is upright — a mullion. 0° is level — a transom.
        { angle: 90, spacing: mullionSpacing, phase: mullionPhase },
        { angle: 0, spacing: transomSpacing, phase: transomPhase },
      ],
      profile,
      barWidth * 3,
    );
    this.barCount = parts.length;

    if (parts.length === 0) {
      this.computeBoundingSphere();
      return;
    }

    // Not cast — `mergeGeometries` returns null on mismatched attributes, and a cast turns that into an
    // unreadable "cannot read properties of null" three frames later.
    const merged = mergeGeometries(parts, false);
    if (!merged) throw new Error("GregorianLatticeGeometry: bar parts have incompatible attributes.");

    this.copy(merged);
    merged.dispose();
    parts.forEach((part) => part.dispose());
    this.computeBoundingSphere();
  }
}
