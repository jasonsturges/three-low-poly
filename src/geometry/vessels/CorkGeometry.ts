import { LatheGeometry, Vector2 } from "three";

export interface CorkGeometryOptions {
  /** Radius at the MIDDLE — the seal, where the cork meets the rim. Defaults to `0.5`. */
  radius?: number;
  /** Radius at the top (head). Wider than the middle flares a lipped head; narrower tapers it in. Defaults to `1.15 ×`. */
  topRadius?: number;
  /** Radius at the bottom (tip). Defaults to `0.7 ×` the middle radius. */
  bottomRadius?: number;
  /** Upper taper height, middle → top. `0` gives a flat-topped lid. Defaults to `0.18`. */
  upperHeight?: number;
  /** Lower taper height, middle → bottom (the part that goes into the neck). Defaults to `0.28`. */
  lowerHeight?: number;
  /** Circumference segments. Defaults to `16`. */
  radialSegments?: number;
}

/**
 * Cork stopper — a bi-taper barrel referenced from its MIDDLE (the seal plane).
 *
 * Middle → top is the upper taper (sits above the vessel); middle → bottom is the lower taper (goes into the
 * neck). The head may flare *wider* than the middle (a lipped stopper, `\===/`) or taper narrower (a barrel).
 * `upperHeight: 0` gives a flat-topped lid; equal upper/lower tapers make a wine cork.
 *
 * {@link ApothecaryJar} scales the cork uniformly so the lower taper's radius meets the opening exactly at
 * the chosen depth — a watertight seal at any height.
 *
 * Local frame: bottom on Y=0, seal middle at Y=`lowerHeight`.
 */
export class CorkGeometry extends LatheGeometry {
  readonly radius: number;
  readonly bottomRadius: number;
  readonly middleY: number;
  readonly height: number;

  constructor({
    radius = 0.5,
    topRadius,
    bottomRadius,
    upperHeight = 0.18,
    lowerHeight = 0.28,
    radialSegments = 16,
  }: CorkGeometryOptions = {}) {
    const tr = topRadius ?? radius * 1.15;
    const br = bottomRadius ?? radius * 0.7;
    const topY = lowerHeight + upperHeight;
    const points = [
      new Vector2(0, 0),
      new Vector2(br, 0), // bottom (tip)
      new Vector2(radius, lowerHeight), // middle (seal)
    ];
    // A separate top ring only when there is an actual head; otherwise the middle IS the flat top (a lid),
    // and a duplicate point would lathe a ring of zero-area quads with undefined normals.
    if (upperHeight > 1e-4 || Math.abs(tr - radius) > 1e-4) points.push(new Vector2(tr, topY));
    points.push(new Vector2(0, topY));
    super(points, radialSegments);
    this.radius = radius;
    this.bottomRadius = br;
    this.middleY = lowerHeight;
    this.height = lowerHeight + upperHeight;
  }
}
