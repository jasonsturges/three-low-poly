import {
  BufferAttribute,
  BufferGeometry,
  ColorRepresentation,
  DoubleSide,
  Material,
  Mesh,
  MeshStandardMaterial,
} from "three";

export interface CycloramaOptions {
  /** Extent across, along X. Defaults to `3`. */
  width?: number;
  /** How far the back wall rises. Defaults to `1.8`. */
  height?: number;
  /** How far the floor runs toward the camera. Defaults to `1.8`. */
  depth?: number;
  /**
   * The cove's radius — **the only control the bend has.** Defaults to `0.7`.
   *
   * A cyclorama's corner is always 90°, and a quarter arc is fully determined by its radius, so there is
   * no span or angle to give. Clamped to `min(height, depth)`, because a curve larger than its own flats
   * would run past the ends of the sheet; the value used is reported as {@link Cyclorama.radius}.
   */
  radius?: number;
  /**
   * How finely the cove is cut. Defaults to `12`.
   *
   * **This one is not a style knob.** A cyclorama exists so the bend is not visible, and faceting is the
   * bend becoming visible — see {@link Cyclorama.sagitta} for how to choose it by measurement rather than
   * by eye.
   */
  segments?: number;
  /** Backdrop tint. Defaults to `0xd8d5d0` — a paper grey. */
  color?: ColorRepresentation;
  /**
   * A material to use instead of the default.
   *
   * **Do not give it `flatShading: true`.** The house style everywhere else in this library is faceted,
   * and here it defeats the object entirely — see the note on shading below.
   */
  material?: Material;
}

/**
 * A seamless backdrop: a wall curving into a floor with no visible join. A CYCLORAMA — an infinity cove,
 * or in a photographer's words simply a SWEEP, after the roll of paper it imitates.
 *
 * Stands with its back wall on `z = 0` rising in `+Y`, and its floor running toward `+Z`, centred on X.
 * A development and presentation aid like {@link GroundGrid}, not scene content.
 *
 * **The bend has exactly one control, and that is a property of the shape rather than a simplification.**
 * The corner is always 90°, so the arc is fully determined by its `radius`. `width`, `height` and `depth`
 * only say where the flats END; none of them touches what the curve does.
 *
 * **Why the join disappears.** The arc's centre sits at `(radius, radius)` — one radius in from the wall
 * and one up from the floor — which is the only place a circle can be tangent to both planes at once. At
 * tangency the curve leaves each flat travelling in exactly that flat's own direction, so there is no
 * crease for light to catch. Move the centre anywhere else and a corner appears, however smooth the
 * geometry.
 *
 * **Shading: this is the one place `flatShading` is wrong.** Every other low-poly surface in this library
 * wants to read as intentionally faceted; a cyclorama wants to read as continuous, and faceting IS seeing
 * the bend. The geometry is therefore INDEXED on purpose, so `computeVertexNormals` averages across each
 * seam along the profile and the cove shades as one surface. Supply your own material and it must be
 * smooth, or the whole thing collapses into a fan of bands.
 *
 * **Choosing `segments` by measurement.** {@link Cyclorama.sagitta} reports how deep each facet dips
 * inside the true arc — `r · (1 − cos(θ/2))`. On a `0.7` radius, 3 segments dips 24mm and the banding is
 * obvious; 12 dips 1.5mm and it is not. Compare it against how close the camera gets rather than guessing.
 *
 * @example
 * ```ts
 * const backdrop = new Cyclorama({ width: 4, radius: 0.9 });
 * scene.add(backdrop);
 * backdrop.sagitta; // how visible the faceting is, in world units
 * backdrop.dispose();
 * ```
 */
export class Cyclorama extends Mesh<BufferGeometry, Material> {
  /** The cove radius actually used, after clamping to `min(height, depth)`. */
  readonly radius: number;
  /**
   * How far each facet's chord dips inside the true arc, in world units — the thing an eye catches.
   * Raise `segments` until this is small against the distance the backdrop is seen from.
   */
  readonly sagitta: number;

  readonly #ownsMaterial: boolean;

  constructor({
    width = 3,
    height = 1.8,
    depth = 1.8,
    radius = 0.7,
    segments = 12,
    color = 0xd8d5d0,
    material,
  }: CycloramaOptions = {}) {
    // The arc has to fit inside both flats, or it would run past the ends of the sheet.
    const fitted = Math.min(radius, height, depth);
    const steps = Math.max(1, Math.round(segments));

    // The profile, in (z out from the wall, y up).
    const profile: [number, number][] = [[0, height]];
    if (height - fitted > 1e-6) profile.push([0, fitted]);
    // The quarter, walked from 180° to 270° about a centre at (r, r): at 180° it meets the wall, at 270°
    // the floor. Those are the tangent points, and putting the centre there is what removes the crease.
    for (let i = 0; i <= steps; i++) {
      const t = Math.PI + (Math.PI / 2) * (i / steps);
      profile.push([fitted + fitted * Math.cos(t), fitted + fitted * Math.sin(t)]);
    }
    if (depth - fitted > 1e-6) profile.push([depth, 0]);

    // A radius that exactly fills a flat repeats a point. A zero-length step would leave a degenerate quad
    // in the ribbon and a NaN in its normal.
    const points = profile.filter(
      (p, i) => i === 0 || Math.hypot(p[0] - profile[i - 1]![0], p[1] - profile[i - 1]![1]) > 1e-9,
    );

    // INDEXED, deliberately. Sharing the vertices along the profile is what lets `computeVertexNormals`
    // average across each seam — and that averaging is the entire reason the cove reads as continuous. A
    // non-indexed ribbon gets one normal per facet and shows every one of them.
    const half = width / 2;
    const positions = new Float32Array(points.length * 6);
    const uvs = new Float32Array(points.length * 4);
    points.forEach(([z, y], i) => {
      const t = points.length === 1 ? 0 : i / (points.length - 1);
      positions.set([-half, y, z], i * 6);
      positions.set([half, y, z], i * 6 + 3);
      uvs.set([0, t], i * 4);
      uvs.set([1, t], i * 4 + 2);
    });

    const indices: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    super(
      geometry,
      material ??
        // Smooth, and double-sided so a camera that strays behind it does not see through the sheet.
        new MeshStandardMaterial({
          color,
          roughness: 0.95,
          metalness: 0,
          side: DoubleSide,
          flatShading: false,
        }),
    );

    this.#ownsMaterial = material === undefined;
    this.radius = fitted;
    this.sagitta = fitted * (1 - Math.cos(Math.PI / 4 / steps));
    this.receiveShadow = true;
  }

  /** Releases the geometry, and the material when this backdrop made it. */
  dispose(): void {
    this.geometry.dispose();
    if (this.#ownsMaterial) this.material.dispose();
  }
}
