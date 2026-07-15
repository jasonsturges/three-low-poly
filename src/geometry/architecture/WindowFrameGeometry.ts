import { ExtrudeGeometry, Path, Shape } from "three";
import { openingOutline, type WallOpeningOptions } from "../../shapes/WallShape";
import { offsetLoop } from "../../utils/OffsetLoop";

/** The frame's outer silhouette follows the arch to a point — a finial on an ogee. */
const OUTER_MITER = 6;
/** The inner aperture blunts a sharp point rather than spiking a needle into the glass. */
const INNER_MITER = 2;

export interface WindowFrameGeometryOptions {
  /** The opening this frame rings. The SAME description the wall was punched with. */
  opening: WallOpeningOptions;
  /**
   * How far the frame's inner edge bites INTO the aperture. Defaults to `0.03`.
   *
   * This is what holds the glass, and what you actually see: the thin line of wood or iron running all
   * the way around the pane, arch included.
   */
  inset?: number;
  /**
   * How far the frame's outer edge sits OUT on the wall, past the opening. Defaults to `0.06`.
   *
   * `0` gives a frame that fills the aperture and stops — a glazing bead, flush with the reveal. Anything
   * more and it becomes a casing, lying on the wall's face like a picture frame.
   */
  outset?: number;
  /** How far the frame stands out of the wall. Defaults to `0.05`. */
  depth?: number;
  /** How finely the arch is followed — the low-poly knob. Defaults to `48`. */
  curveSegments?: number;
}

/**
 * The frame around a window: a flat RING that follows the opening all the way around — up the jambs, over
 * the arch, and closed along the sill.
 *
 * **A glazing bead and a picture-frame casing are the same geometry.** One bites into the aperture, the
 * other spills out onto the wall, and both are just two offsets of one outline. So there is one class,
 * with a signed `inset` and `outset`, rather than two that would drift apart.
 *
 * The ring's inner boundary is strictly interior to its outer one, so here `Shape.holes` is exactly
 * right — unlike a doorway, which touches the floor and must be notched into the outline instead. Same
 * rule, opposite answer, which is the whole reason the rule is worth stating.
 *
 * **It rings ANY arch**, because it offsets the CURVE rather than the opening's parameters: an offset
 * ellipse is not an ellipse and an offset ogee is not an ogee, so a frame built by shrinking `width` and
 * `archHeight` would pinch and swell around the arch instead of holding its width. See {@link offsetLoop}.
 *
 * Drawn at the ORIGIN — centered on X, sill at `y = 0` — regardless of where the opening sits in its
 * wall, so one frame can be positioned into many openings. Extrudes into `+z`.
 *
 * @example
 * ```ts
 * const opening = { width: 0.8, height: 1, arch: "ogee" } as const;
 *
 * const bead   = new WindowFrameGeometry({ opening, inset: 0.04, outset: 0 });     // holds the glass
 * const casing = new WindowFrameGeometry({ opening, inset: 0.02, outset: 0.1 });   // sits on the wall
 * ```
 */
export class WindowFrameGeometry extends ExtrudeGeometry {
  constructor({
    opening,
    inset = 0.03,
    outset = 0.06,
    depth = 0.05,
    curveSegments = 48,
  }: WindowFrameGeometryOptions) {
    // At the origin: the frame does not care where its opening sits in the wall, only what shape it is.
    const outline = openingOutline({ ...opening, x: 0, y: 0 }).getPoints(curveSegments);

    // The two edges of the frame want opposite things at a sharp arch (an ogee or a pointed crown), and
    // it is the same corner offset in two directions:
    //   - the OUTER edge is the frame's silhouette, so it should come to a POINT like the arch does — a
    //     generous mitre limit lets that finial form;
    //   - the INNER edge is the aperture, where a sharp point would stab a needle down into the glass —
    //     a tight limit bevels it into a clean blunt.
    const outer = new Shape(offsetLoop(outline, outset, OUTER_MITER));

    // Wound the other way, because a hole runs against its container.
    const inner = new Path(offsetLoop(outline, -inset, INNER_MITER).reverse());
    outer.holes.push(inner);

    super(outer, { depth, bevelEnabled: false, curveSegments });
  }
}
