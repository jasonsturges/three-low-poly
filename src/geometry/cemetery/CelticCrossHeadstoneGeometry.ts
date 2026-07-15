import { BufferGeometry, ExtrudeGeometry, Path, Shape } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface CelticCrossHeadstoneGeometryOptions {
  /** Total height, base to the top of the upper arm. Defaults to `1.3`. */
  height?: number;
  /** Arm span — the full horizontal extent. Defaults to `0.62`. */
  span?: number;
  /** Arm thickness at the neck, where it leaves the crossing. Defaults to `0.12`. */
  thickness?: number;
  /**
   * Where the arms cross, as a fraction of `height`. Defaults to `0.7`.
   *
   * A cross carries its arms high — the shaft below is the long part.
   */
  crossing?: number;
  /**
   * How far each arm splays at its tip, beyond the neck half-width. Defaults to `0.03`. `0` gives a
   * plain straight cross. The base never flares — it sits flat on the ground.
   */
  flare?: number;
  /**
   * The nimbus — the ring at the crossing. `true` for a default radius, a number to set the outer radius,
   * `false` for a plain flared cross with no ring. Defaults to `true`.
   */
  ring?: boolean | number;
  /** Width of the ring band. Defaults to `0.085`. */
  ringWidth?: number;
  /** Slab depth. Defaults to `0.14`. */
  depth?: number;
  /** Curve resolution of the flares and the ring — the low-poly knob. Defaults to `20`. */
  curveSegments?: number;
}

/**
 * Celtic cross headstone — a cross with gently flared arms, ringed by a nimbus at the crossing.
 *
 * **It is two outlines, extruded and merged** — the same method as everything else in this vocabulary. The
 * cross is one closed silhouette (the shaft rises unbroken through the crossing, the three free arms splay
 * at their tips, the base stays flat), and the ring is an annulus (a disc with a disc-shaped hole). No
 * boxes, no booleans — a drawing given depth.
 *
 * The ring stands a hair PROUD of the cross, rather than flush with it. Two coplanar faces at the same
 * depth z-fight; lifting the ring's faces just clear of the arms' avoids it and reads as a raised ring,
 * which is what a carved Celtic cross actually has.
 *
 * Set `ring: false` and it is a plain flared cross — the nimbus is the only thing the ring adds.
 *
 * Local frame: base on Y=0, centered on X/Z.
 *
 * @example
 * ```ts
 * const celtic = new CelticCrossHeadstoneGeometry();
 * const flared = new CelticCrossHeadstoneGeometry({ ring: false, flare: 0.06 });
 * ```
 */
export class CelticCrossHeadstoneGeometry extends BufferGeometry {
  readonly height: number;
  readonly span: number;

  constructor({
    height = 1.3,
    span = 0.62,
    thickness = 0.12,
    crossing = 0.7,
    flare = 0.03,
    ring = true,
    ringWidth = 0.085,
    depth = 0.14,
    curveSegments = 20,
  }: CelticCrossHeadstoneGeometryOptions = {}) {
    super();

    this.height = height;
    this.span = span;

    const n = thickness / 2; // neck half-width
    const t = n + flare; // tip half-width
    const cy = height * crossing; // crossing center, in base-at-0 coordinates
    const R = span / 2; // arm reach

    const cross = new Shape();

    // Up the right side of the shaft from the flat base to the crossing.
    cross.moveTo(n, 0);
    cross.lineTo(n, cy - n);

    // The right arm: splay out under it to the flared tip, up the tip, splay back over it. Each flare
    // bows toward the outer corner, so the arm keeps its width then opens at the very end.
    cross.quadraticCurveTo(R, cy - n, R, cy - t);
    cross.lineTo(R, cy + t);
    cross.quadraticCurveTo(R, cy + n, n, cy + n);

    // Up the right side of the upper shaft, and out to the flared TOP tip.
    cross.lineTo(n, height - flare * 1.5);
    cross.quadraticCurveTo(n, height, t, height);
    cross.lineTo(-t, height);
    cross.quadraticCurveTo(-n, height, -n, height - flare * 1.5);

    // Down the left side of the upper shaft, and the left arm, mirror of the right.
    cross.lineTo(-n, cy + n);
    cross.quadraticCurveTo(-R, cy + n, -R, cy + t);
    cross.lineTo(-R, cy - t);
    cross.quadraticCurveTo(-R, cy - n, -n, cy - n);

    // Down the left side of the shaft, and closePath runs flat across the base.
    cross.lineTo(-n, 0);
    cross.closePath();

    const extrude = { depth, bevelEnabled: false, curveSegments };
    const parts: BufferGeometry[] = [new ExtrudeGeometry(cross, extrude)];

    // The ring sits INSIDE the arm span, so the arm tips reach past it — a cross wearing a ring, not a
    // wheel. It also stays clear of the base, floating at the crossing.
    const ringOuter = typeof ring === "number" ? ring : Math.min(R, cy - n) * 0.82;
    if (ring !== false && ringOuter - ringWidth > 1e-3) {
      const annulus = new Shape();
      annulus.absarc(0, cy, ringOuter, 0, Math.PI * 2, false);
      const hole = new Path();
      hole.absarc(0, cy, ringOuter - ringWidth, 0, Math.PI * 2, true);
      annulus.holes.push(hole);

      // Proud of the cross so its front/back faces never sit coplanar with the arms'.
      const ringDepth = depth * 1.08;
      const band = new ExtrudeGeometry(annulus, { ...extrude, depth: ringDepth });
      band.translate(0, 0, -(ringDepth - depth) / 2);
      parts.push(band);
    }

    const merged = mergeGeometries(parts);
    if (!merged) throw new Error("CelticCrossHeadstoneGeometry: merge failed");
    // Extrude runs local z 0 → depth; center it so the stone sinks and leans about its own middle.
    merged.translate(0, 0, -depth / 2);

    this.copy(merged);
    merged.dispose();
    for (const part of parts) part.dispose();
    this.computeVertexNormals();
  }
}
