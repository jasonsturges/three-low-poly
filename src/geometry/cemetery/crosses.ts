import { type BufferGeometry, Shape, Vector2 } from "three";
import { HOUSE, bevelBox, extrudeOutline, mergeStone } from "./stoneParts";

/**
 * The cross markers: a Latin cross, the same cross with flared arms, the Celtic cross with its nimbus, and
 * any of them raised on a stepped base — a calvary.
 *
 * Like a tablet, a cross is a SILHOUETTE given depth: {@link crossOutline} draws it, the kit's
 * `extrudeOutline` cuts it with its arrises chamfered. The ring is a second outline — an annulus — standing
 * a little proud of the arms.
 *
 * One geometry for one stone material: base at `y = 0`, centred on X and Z, the face toward `+Z`.
 */

export interface CrossOutlineOptions {
  /** Total height, base to the top of the upper arm. Defaults to `1.15`. */
  height?: number;
  /** Arm span — the full horizontal extent. Defaults to `0.55`. */
  span?: number;
  /** Shaft and arm thickness at the neck, where the arms leave the crossing. Defaults to `0.15`. */
  thickness?: number;
  /** Where the arms cross, as a fraction of `height`. A Latin cross carries them high. Defaults to `0.68`. */
  crossing?: number;
  /** How far each free arm splays at its tip, beyond the neck. `0` is a plain cross. Defaults to `0`. */
  flare?: number;
  /** Points along each flare. Defaults to `8`. */
  segments?: number;
}

export const CROSS_OUTLINE_DEFAULTS: Required<CrossOutlineOptions> = {
  height: 1.15,
  span: 0.55,
  thickness: 0.15,
  crossing: 0.68,
  flare: 0,
  segments: 8,
};

/**
 * The cross's silhouette, counter-clockwise from the foot of the shaft. The shaft rises unbroken through the
 * crossing; the three free arms splay at their tips when `flare` is set; the foot never flares — it stands
 * flat in the ground.
 */
export function crossOutline(options: CrossOutlineOptions = {}): Vector2[] {
  const o = { ...CROSS_OUTLINE_DEFAULTS, ...options };
  const n = o.thickness / 2; // neck half-width
  const t = n + o.flare; // tip half-width
  const cy = o.height * o.crossing;
  const R = o.span / 2;
  const h = o.height;
  //  A flare leaves the neck straight, bends outward, and meets the tip edge at an ANGLE. Its control point
  //  sits short of the tip: on the tip line, the curve would end tangent to the tip edge and the outline
  //  would double back along it — a cusp the chamfer's inset folds over.
  const reach = R - n; // a side arm's free length
  const bend = n + reach * 0.75;
  //  The upper arm flares over as long, if it has room above the crossing.
  const up = Math.min(reach, (h - cy - n) * 0.9);

  const s = new Shape();
  s.moveTo(-n, 0);
  s.lineTo(n, 0);
  s.lineTo(n, cy - n);
  //  The right arm.
  s.quadraticCurveTo(bend, cy - n, R, cy - t);
  s.lineTo(R, cy + t);
  s.quadraticCurveTo(bend, cy + n, n, cy + n);
  //  Up the upper arm to its flared tip, across, and down the other side.
  s.lineTo(n, h - up);
  s.quadraticCurveTo(n, h - up * 0.25, t, h);
  s.lineTo(-t, h);
  s.quadraticCurveTo(-n, h - up * 0.25, -n, h - up);
  //  The left arm, mirror of the right.
  s.lineTo(-n, cy + n);
  s.quadraticCurveTo(-bend, cy + n, -R, cy + t);
  s.lineTo(-R, cy - t);
  s.quadraticCurveTo(-bend, cy - n, -n, cy - n);

  //  An unflared cross draws its curves as straight runs; drop the repeated and collinear points they leave.
  const clean: Vector2[] = [];
  for (const p of s.getPoints(o.segments)) {
    const last = clean[clean.length - 1];
    if (!last || last.distanceTo(p) > 1e-5) clean.push(p);
  }
  if (clean.length > 1 && clean[0]!.distanceTo(clean[clean.length - 1]!) < 1e-5) clean.pop();
  return clean.filter((b, i) => {
    const a = clean[(i + clean.length - 1) % clean.length]!;
    const c = clean[(i + 1) % clean.length]!;
    return Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) > 1e-9;
  });
}

export interface CrossOptions extends CrossOutlineOptions {
  /** Slab depth. Defaults to `0.14`. */
  depth?: number;
  /**
   * The nimbus at the crossing — a Celtic cross. The ring sits inside the arm span, so the arms reach past
   * it: a cross wearing a ring, not a wheel. Defaults to `false`.
   */
  ring?: boolean;
  /**
   * The ring's outer radius as a fraction of the room it has — the shorter of the arm's reach and the
   * height of the crossing above the shaft. Defaults to `0.82`.
   */
  ringSize?: number;
  /** Width of the ring's band. Defaults to `0.085`. */
  ringWidth?: number;
  /** Points round the ring. Defaults to `24`. */
  ringSegments?: number;
  /**
   * Steps the cross stands on — a calvary. `0` sets the cross straight into the ground. Each step is a
   * squat block narrower than the one under it. Defaults to `0`.
   */
  steps?: number;
  /** The chamfer on every arris. Defaults to `0.01`. */
  bevel?: number;
}

export const CROSS_DEFAULTS: Required<CrossOptions> = {
  ...CROSS_OUTLINE_DEFAULTS,
  depth: 0.14,
  ring: false,
  ringSize: 0.82,
  ringWidth: 0.085,
  ringSegments: 24,
  steps: 0,
  bevel: 0.01,
};

/**
 * A cross marker. Plain by default; `flare` splays its arms, `ring` makes it Celtic, `steps` raises it on a
 * calvary. `height` is the cross's own height — steps add to it.
 */
export function crossGeometry(options: CrossOptions = {}): BufferGeometry {
  const o = { ...CROSS_DEFAULTS, ...options };
  const parts: BufferGeometry[] = [];

  //  The calvary: steps rising toward the cross, each one housed in the one below.
  let foot = 0;
  const stepHeight = 0.12;
  for (let i = 0; i < o.steps; i++) {
    const shrink = (o.steps - i) * 0.2;
    const w = o.thickness + 0.16 + shrink;
    const d = o.depth + 0.12 + shrink * 0.8;
    parts.push(bevelBox(w, stepHeight + (i > 0 ? HOUSE : 0), d, { y: foot - (i > 0 ? HOUSE : 0) }));
    foot += stepHeight;
  }
  const sunk = o.steps > 0 ? foot - HOUSE : 0;

  const cross = extrudeOutline(crossOutline(o), o.depth, { bevel: o.bevel });
  cross.translate(0, sunk, 0);
  parts.push(cross);

  const n = o.thickness / 2;
  const cy = o.height * o.crossing;
  const outer = Math.min(o.span / 2, cy - n) * o.ringSize;
  if (o.ring && outer - o.ringWidth > 1e-3) {
    const circle = (r: number, reverse: boolean) =>
      Array.from({ length: o.ringSegments }, (_, i) => {
        const a = ((reverse ? -i : i) / o.ringSegments) * Math.PI * 2;
        return new Vector2(r * Math.cos(a), cy + r * Math.sin(a));
      });
    //  A little proud of the arms, so the ring's faces never sit coplanar with theirs — and a carved
    //  Celtic cross's ring is raised anyway.
    const band = extrudeOutline(circle(outer, false), o.depth * 1.12, { bevel: o.bevel, holes: [circle(outer - o.ringWidth, true)] });
    band.translate(0, sunk, 0);
    parts.push(band);
  }
  return mergeStone(parts);
}
