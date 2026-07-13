import { LatheGeometry, SplineCurve, Vector2 } from "three";

export interface VaseGeometryOptions {
  /**
   * The silhouette, as radii from the foot to the lip. The spline passes THROUGH these, so they behave
   * like handles you drag rather than weights you nudge. Defaults to `[0.55, 0.95, 0.8, 0.5, 0.62]` —
   * a swelling belly, a slight waist, and a flared lip.
   *
   * Any number of points is accepted; they are spaced evenly up `height`. Two gives a cone.
   */
  radii?: number[];
  /** Overall height. Defaults to `2.4`. */
  height?: number;
  /** How finely the silhouette is sampled — the smoothness of the curve. Defaults to `40`. */
  profileSegments?: number;
  /** How many times the silhouette is revolved — the low-poly knob. `6` gives a faceted, hand-thrown pot. Defaults to `32`. */
  radialSegments?: number;
}

/**
 * Vase — a silhouette revolved around an axis.
 *
 * A vase is a LATHE, not a sweep: it revolves a profile rather than carrying a cross-section along a
 * path. Which is easy to say, and still misses the thing that actually makes pottery hard:
 *
 * **A pot's silhouette is not a mathematical function.**
 *
 * *Swelling at the foot, pinched at the waist, flaring at the lip* does not come out of a parabola, a
 * sine, or an easing curve — those are single-inflection shapes, and a pot has three or four. Reaching
 * for a formula is the mistake, because no formula has the shape in it.
 *
 * What a pot's profile actually is: **a handful of control points with a spline through them.** Which
 * is precisely what the Utah teapot is — a few hundred hand-placed control points and an evaluator.
 * You do not compute a pot's curve; you AUTHOR it, and then you tessellate it. Small data, plus a
 * generating function.
 *
 * So the radii ARE the design. Raise the second and the bulge sits low; raise the fourth instead and
 * it climbs to the shoulder; pinch the middle for an hourglass. One geometry covers all three, because
 * it is not committed to any curve family.
 *
 * Local frame: foot on Y=0, opening up +Y.
 *
 * @example
 * ```ts
 * const geometry = new VaseGeometry({ radii: [0.4, 1, 0.7, 0.35, 0.5], height: 2.4 });
 * ```
 */
export class VaseGeometry extends LatheGeometry {
  readonly height: number;

  constructor({
    radii = [0.55, 0.95, 0.8, 0.5, 0.62],
    height = 2.4,
    profileSegments = 40,
    radialSegments = 32,
  }: VaseGeometryOptions = {}) {
    const control = radii.map(
      (r, i) => new Vector2(Math.max(r, 0.001), (i / Math.max(1, radii.length - 1)) * height),
    );

    const silhouette = new SplineCurve(control).getPoints(profileSegments);

    // A flat foot: run in from the axis out to the base radius before the curve begins. Without it the
    // pot is an open shell and you can see straight up inside it — which is what DoubleSide hides
    // rather than fixes. The tiny non-zero x keeps the lathe from collapsing the ring onto the axis.
    //
    // Only ONE point is prepended. The spline already starts at the foot, so adding `(r0, 0)` as well
    // would duplicate it — and a repeated profile point lathes into a ring of zero-area quads whose
    // normals are undefined.
    super([new Vector2(0.001, 0), ...silhouette], radialSegments);

    this.height = height;
  }
}
