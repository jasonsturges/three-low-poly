import { CylinderGeometry } from "three";

export interface HewnTimberGeometryOptions {
  /** Radius at the top. Defaults to `0.5`. */
  topRadius?: number;
  /**
   * Radius at the bottom. Defaults to `0.55`.
   *
   * The taper is what stops a rank of timbers reading as extruded pipe — a real pole is thicker at the
   * butt. Keep it small; past about `1.2 ×` the top it stops looking hewn and starts looking turned.
   */
  bottomRadius?: number;
  /**
   * Facets around the pole. Defaults to `6`.
   *
   * This is the low-poly knob. `6` is a coarse split log; `7`–`8` reads finer and more dressed. Even
   * counts put a flat toward the viewer, odd counts put an edge — which is why `7` looks subtly less
   * machined than `6` at the same radius.
   */
  radialSegments?: number;
  /** Rings along its length. Defaults to `3`. More rings let the irregularity vary along the timber. */
  heightSegments?: number;
  /**
   * Spatial frequency of the surface perturbation, per axis. Defaults to `[17.3, 11.7, 23.1]`.
   *
   * Deliberately mutually prime-ish and unequal: equal frequencies produce a visible helical banding
   * because the three terms come back into phase along the axis.
   */
  frequency?: [number, number, number];
  /** How far the perturbation pushes the surface, as a fraction of radius. Defaults to `0.075`. */
  amplitude?: number;
}

/**
 * A split-timber log: a low-segment cylinder pushed off-round so the facets read as axe-hewn rather than
 * turned.
 *
 * Authored along local **Y at unit length** and roughly unit diameter, so callers scale it to the beam
 * they need — one geometry serves a whole rank of posts and rails at different sizes.
 *
 * **The perturbation is derived from the vertex's own position**, not from a random source. That keeps
 * the asset deterministic — the same timber every load, no seed to thread through — and keeps the end
 * caps watertight, because a cap vertex and the side vertex it coincides with compute the same offset.
 * Vertices on the axis are skipped: they have no radial direction to push along, and scaling them would
 * tear the cap open.
 *
 * Contrast {@link WeatheredPlankGeometry}, which is the *sawn* member — flat faces, square section, bow
 * and end-skew. This is the *round* one. A frame uses both: hewn posts carrying sawn boards.
 *
 * @example
 * ```typescript
 * // The default: a coarse 6-facet split log.
 * const post = new Mesh(createHewnTimberGeometry(), timber);
 * post.scale.set(0.14, 1.8, 0.14);
 *
 * // Finer and softer — the city-park footbridge tuning.
 * const rail = createHewnTimberGeometry({
 *   bottomRadius: 0.54,
 *   radialSegments: 7,
 *   frequency: [19.1, 13.7, 29.3],
 *   amplitude: 0.065,
 * });
 * ```
 */
export function createHewnTimberGeometry({
  topRadius = 0.5,
  bottomRadius = 0.55,
  radialSegments = 6,
  heightSegments = 3,
  frequency = [17.3, 11.7, 23.1],
  amplitude = 0.075,
}: HewnTimberGeometryOptions = {}): CylinderGeometry {
  const geometry = new CylinderGeometry(
    topRadius,
    bottomRadius,
    1,
    radialSegments,
    heightSegments,
    false,
  );
  const position = geometry.attributes.position;
  const [fx, fy, fz] = frequency;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    // On the axis there is no radial direction to push along, and scaling would tear the cap.
    if (Math.hypot(x, z) < 0.01) continue;

    // Derived from the existing vertex, keeping the asset deterministic and its end caps watertight
    // while breaking the lathed look.
    const irregularity = 1 + Math.sin(x * fx + y * fy + z * fz) * amplitude;
    position.setXYZ(i, x * irregularity, y, z * irregularity);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
