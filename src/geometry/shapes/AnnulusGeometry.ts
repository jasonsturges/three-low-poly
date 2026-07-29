import { LatheGeometry, Vector2 } from "three";

export interface AnnulusGeometryOptions {
  /** Outer radius — centre to the outer wall. Defaults to `1`. */
  radius?: number;
  /**
   * Radius of the bore. Defaults to `0.5`.
   *
   * Clamped to stay strictly inside `radius`, so a bore wider than the ring cannot invert the wall. A value
   * of `0` or less is clamped to a hair above zero rather than producing a solid disc — a solid disc is a
   * different shape, and {@link PolygonGeometry} says it more plainly.
   */
  holeRadius?: number;
  /** Thickness, along `+Y` from the resting plane. Defaults to `0.15`. */
  depth?: number;
  /**
   * Sides around the ring. Defaults to `24`.
   *
   * **This is the low-poly dial.** `24` reads as smooth, `8` is visibly faceted, and `4` is a genuine square
   * washer — the same construction throughout, so faceting is a parameter rather than a different shape.
   */
  sides?: number;
  /** Rotation about `+Y` in radians. Defaults to `0`. Only visible on a low `sides` count. */
  rotation?: number;
}

/**
 * A flat ring with a bore, square in section — a washer, a pipe collar, a well rim, a coin blank.
 *
 * Built as a **surface of revolution**: the four sides you see are four points of a rectangular profile spun
 * around `+Y`. That is why it costs so little — at 8 sides it is 64 triangles across 45 shared vertices,
 * where the same ring extruded from a 2D shape with a hole runs to 384 unshared vertices for no visual gain.
 *
 * Local frame: **rests on the `y = 0` plane**, occupying `+Y` up to `depth`, centred on the origin in XZ.
 * Ground contact, like the rest of the library — no translate needed to stand it on a floor.
 *
 * Material groups: **none** — one continuous surface, one material.
 *
 * **On shading:** the profile's corner vertices are shared between the faces that meet there, so under
 * *smooth* shading those edges soften. With `flatShading: true` — which this library uses throughout — normals
 * are computed per face and the edges are hard, which is what a washer wants. If you ever need smooth shading
 * elsewhere on the mesh, duplicate the corner profile points to split the rings; it costs 72 vertices instead
 * of 45.
 *
 * @example
 * ```typescript
 * const washer = new Mesh(new AnnulusGeometry({ radius: 0.5, holeRadius: 0.2, depth: 0.06 }), iron);
 * ```
 */
export class AnnulusGeometry extends LatheGeometry {
  readonly radius: number;
  /** The bore radius actually used, after clamping inside `radius`. */
  readonly holeRadius: number;
  readonly depth: number;
  readonly sides: number;

  constructor({
    radius = 1,
    holeRadius = 0.5,
    depth = 0.15,
    sides = 24,
    rotation = 0,
  }: AnnulusGeometryOptions = {}) {
    const segments = Math.max(3, Math.round(sides));
    // A bore at or past the outer wall would invert the section. Leave a sliver of material rather than
    // silently collapsing to a tube with no wall.
    const bore = Math.min(Math.max(holeRadius, radius * 1e-4), radius * 0.999);

    // Inner→outer along the bottom, up the outer wall, back across the top, and closed by the repeat. The
    // order is what orients the faces: reversed, every normal points inward and the ring renders inside-out.
    // The repeated first point is what closes the section into four walls — drop it and the bore has no wall.
    super(
      [
        new Vector2(bore, 0),
        new Vector2(radius, 0),
        new Vector2(radius, depth),
        new Vector2(bore, depth),
        new Vector2(bore, 0),
      ],
      segments,
      rotation,
    );

    this.radius = radius;
    this.holeRadius = bore;
    this.depth = depth;
    this.sides = segments;
  }
}
