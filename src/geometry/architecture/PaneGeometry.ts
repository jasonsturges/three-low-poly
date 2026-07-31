import { Shape, ShapeGeometry, Vector2 } from "three";
import { openingOutline, type WallOpeningOptions } from "../../shapes/WallShape";
import { offsetLoop } from "../../utils/OffsetLoop";

export interface PaneGeometryOptions {
  /**
   * The opening the pane glazes. The SAME description a wall is punched with, a
   * {@link WindowFrameGeometry} rings, and a {@link DiamondLatticeGeometry} fills — so the four agree by
   * construction rather than by keeping numbers in step.
   */
  opening?: WallOpeningOptions;
  /**
   * How far the pane runs PAST the opening, into the frame's rebate. Defaults to `0`.
   *
   * A real pane is oversize, not undersize: its edge is hidden in the groove that holds it, and the
   * visible opening is the frame. `0` fills the opening exactly, which is what a leaded light does, since
   * there the came holds the glass rather than a rebate. A NEGATIVE value pulls the pane in and leaves a
   * deliberate reveal — rarely what you want, because it reads as glass that does not fit.
   */
  rebate?: number;
  /** How finely the arch is followed — the low-poly knob. Defaults to `24`. */
  curveSegments?: number;
  /**
   * How far a corner's offset may reach before it bevels, as a multiple of `rebate`. Defaults to `4`,
   * the SVG default. Only consulted when `rebate` is non-zero.
   *
   * It matters when the pane is glazed inside a JAMB: the lining's inner edge is offset with a tight
   * limit so a sharp ogee or pointed head blunts rather than growing a needle, and the glass has to be
   * offset the same way or it will spike where the lining does not. Pass the same value the lining used —
   * {@link WindowFrameGeometry} uses `2` for its inner aperture.
   */
  miterLimit?: number;
}

/**
 * The glass: a flat pane filling an opening.
 *
 * The third of the trio that share one `opening` description, and the one that was missing — a wall can
 * be punched, {@link WindowFrameGeometry} can ring the hole, {@link DiamondLatticeGeometry} can lead it,
 * and until now nothing could glaze it. `ArchedSlabGeometry` is a solid with depth; this is a surface.
 *
 * **A plane, not a solid.** Glass at this scale is a surface: giving it thickness doubles its triangles,
 * buys nothing a low-poly scene can see, and introduces two coincident faces to z-fight. Give it a
 * double-sided material and be done.
 *
 * Follows ANY arch, including `square` — a flat head is an arch-shaped hole with no curve in it — so
 * there is no separate rectangular pane, and the name does not pretend otherwise.
 *
 * Drawn at the ORIGIN — centred on X, sill at `y = 0`, lying in the XY plane at `z = 0` — regardless of
 * where the opening sits in its wall, so one pane can be positioned into many openings and so it lands on
 * a frame and a lattice built from the same description. Material groups: none.
 *
 * @example
 * ```ts
 * const opening = { width: 1.24, height: 1.15, arch: "pointed", archHeight: 0.78 } as const;
 *
 * const glass = new Mesh(new PaneGeometry({ opening }), glazing);
 * const leading = new Mesh(new DiamondLatticeGeometry({ opening }), lead);
 * const frame = new Mesh(new WindowFrameGeometry({ opening }), iron);
 * ```
 */
export class PaneGeometry extends ShapeGeometry {
  constructor({
    opening = {},
    rebate = 0,
    curveSegments = 24,
    miterLimit = 4,
  }: PaneGeometryOptions = {}) {
    // At the origin: the pane does not care where its opening sits in the wall, only what shape it is.
    const outline = openingOutline({ ...opening, x: 0, y: 0 });
    const segments = Math.max(2, Math.round(curveSegments));

    if (Math.abs(rebate) < 1e-9) {
      super(outline, segments);
      return;
    }

    // An OFFSET, not a scale. Growing a rectangle's width and height moves the two axes by different
    // amounts, and on an arch nothing lines up at all — the pane has to keep a constant engagement all
    // the way round, which is what `offsetLoop` is for.
    const points = outline.getPoints(segments).map((p) => new Vector2(p.x, p.y));
    super(new Shape(offsetLoop(points, rebate, miterLimit)), segments);
  }
}
