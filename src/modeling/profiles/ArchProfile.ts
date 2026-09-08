import { Path } from "three";

/**
 * The named arches. Every one answers the same question — *from one springing, over the crown, down to
 * the other* — which is why they are interchangeable, and why this list can grow without breaking anyone.
 *
 * ```
 *   square        semicircle      segmental       horseshoe
 *   ________       _______         _______         _______
 *  |        |     /       \       /        \      |       |
 *  |        |    |         |     |          |      \     /
 *
 *   elliptical      pointed          ogee
 *    _______          /\             /\
 *   /       \        /  \           (  )
 *  |         |      |    |          |  |
 * ```
 */
export type ArchStyle =
  /** No arch at all — a flat lintel. It occupies the same SLOT in an outline, so it belongs here. */
  | "square"
  /** A true half-circle. `rise` is forced to `halfSpan`. The one you want unless you want otherwise. */
  | "semicircle"
  /** A circular arc through the springings and the crown, flatter than a half-circle. It meets the jamb at an ANGLE — a real segmental arch has that kink, and it springs from an impost. */
  | "segmental"
  /** The Moorish arch: the same circle carried PAST the half-circle, so it bulges wider than its span and pinches back in. Wants `rise > halfSpan`. */
  | "horseshoe"
  /** An ellipse. Unlike the circular family it springs VERTICALLY at any rise, so it flows out of the jamb with no corner. */
  | "elliptical"
  /** Two arcs meeting at a point — lancet, gothic. At `rise = halfSpan * √3` it is the classic equilateral arch. */
  | "pointed"
  /** The Persian arch: an S-curve on each side, concave low and convex high, meeting at a sharp point. */
  | "ogee";

/** Where along the arch a trace starts or ends. The crown is the top — for `pointed` and `ogee`, the point. */
export type ArchEnd = "left" | "crown" | "right";

export interface ArchProfileOptions {
  /** Which arch. Defaults to `elliptical`. */
  style?: ArchStyle;
  /** Centerline of the arch. Defaults to `0`. */
  x?: number;
  /** The springing line — the Y where the arch leaves the jambs. */
  y: number;
  /** Half the arch's span. */
  halfSpan: number;
  /**
   * Rise above the springing. Defaults to `halfSpan` — a half-circle.
   *
   * **This is a RADIUS, not an angle**, and it does not follow the span: resize an opening and the arch
   * keeps whatever rise it had, quietly changing character. `rise === halfSpan` is the semicircle.
   */
  rise?: number;
  /** Where the path already is. Defaults to `right`. */
  from?: ArchEnd;
  /** Where to trace to. Defaults to `left`. */
  to?: ArchEnd;
}

/**
 * The rise an arch will ACTUALLY have — `0` for a square head, `halfSpan` for a semicircle, and the
 * requested rise otherwise. Use it for bounds, so a caller never has to re-derive the crown.
 */
export function archRise({ style = "elliptical", halfSpan, rise = halfSpan }: ArchProfileOptions): number {
  if (style === "square") return 0;
  if (style === "semicircle") return halfSpan;

  // The circular family is ONE curve, and `rise` picks which member of it you get. So the names have to
  // hold their own ground, or they lie: a segmental arch carried past `halfSpan` is not a segmental arch
  // at all, it IS a horseshoe, and vice versa. The semicircle is the wall between them.
  //
  //   segmental  <--- halfSpan --->  horseshoe
  //              (the semicircle)
  if (style === "segmental") return Math.min(rise, halfSpan);
  if (style === "horseshoe") return Math.max(rise, halfSpan);

  // A pointed arch cannot rise less than its half-span either. Its two arcs each pass through a springing
  // and the apex, and below that rise they BULGE ABOVE the apex on the way there — you get two humps and
  // a dip where the point should be. The semicircle is the floor of the style, not an arbitrary limit.
  if (style === "pointed") return Math.max(rise, halfSpan);

  return rise;
}

/**
 * **The circular family — `semicircle`, `segmental` and `horseshoe` are one arc.**
 *
 * Given the two springings and a crown, exactly one circle passes through all three, and its radius is
 * `(halfSpan² + rise²) / 2·rise`. What changes is where that puts the center relative to the springing
 * line:
 *
 * - `rise < halfSpan` → center BELOW it. The arc reaches the jamb at an angle: a segmental arch.
 * - `rise === halfSpan` → center ON it. Radius collapses to `halfSpan`: a semicircle.
 * - `rise > halfSpan` → center ABOVE it. The arc sweeps past its widest point and pinches back in to
 *   meet the jambs: a horseshoe.
 *
 * One formula, three arches. The names are intent, not implementation.
 */
function circle(halfSpan: number, rise: number): { radius: number; cy: number } {
  const radius = (halfSpan * halfSpan + rise * rise) / (2 * rise);
  return { radius, cy: rise - radius }; // cy is relative to the springing line
}

/**
 * The two arcs of a `pointed` arch. Each is centered ON the springing line, offset so it passes through
 * one springing and the apex. At `rise === halfSpan` the offset vanishes and both arcs become the same
 * circle — a semicircle. At `rise = halfSpan·√3` each center lands exactly on the OPPOSITE springing,
 * which is the equilateral arch every gothic window is drawn from.
 */
function pointedArc(halfSpan: number, rise: number): { offset: number; radius: number } {
  const offset = (halfSpan * halfSpan - rise * rise) / (2 * halfSpan);
  return { offset, radius: halfSpan - offset };
}

/** Fractions that shape the ogee's S. The inflection is where it stops bulging out and starts pointing in. */
const OGEE_SPRING_HANDLE = 0.4;
const OGEE_INFLECT_X = 0.45;
const OGEE_INFLECT_Y = 0.55;
const OGEE_TANGENT = 0.5;

/**
 * Trace an arch onto a path you already own.
 *
 * **It does not own your shape — it appends a curve to it.** That is deliberate: a slab, a wall, a
 * window and a door all want the same arc but entirely different outlines (shoulders, notches, hinges,
 * holes), so the arc is the only thing worth sharing. Everything else stays where it belongs.
 *
 * The path must already be AT `from` — this only draws the arc itself, never the jambs.
 *
 * @example
 * ```ts
 * // A door's silhouette: up the right side, over the top, down the left.
 * const shape = new Shape();
 * shape.moveTo(-hw, 0);
 * shape.lineTo(hw, 0);
 * shape.lineTo(hw, height);
 * traceArch(shape, { style: "semicircle", y: height, halfSpan: hw, from: "right", to: "left" });
 * shape.closePath();
 * ```
 *
 * @example
 * ```ts
 * // Half an arch — one leaf of a double door, split at the crown.
 * traceArch(shape, { style: "ogee", y: h, halfSpan: hw, rise, from: "crown", to: "left" });
 * ```
 */
export function traceArch(path: Path, options: ArchProfileOptions): void {
  const { style = "elliptical", x = 0, y, halfSpan, from = "right", to = "left" } = options;
  const rise = archRise(options);

  if (from === to) return;

  // A flat head is still an arch-shaped hole in the outline — it just has no curve in it.
  if (style === "square" || rise <= 0) {
    path.lineTo(x + endX(to, halfSpan), y);
    return;
  }

  if (style === "pointed" || style === "ogee") {
    tracePointy(path, style, x, y, halfSpan, rise, from, to);
    return;
  }

  // The circular family and the ellipse are both a single sweep between two parametric angles, so they
  // never need splitting at the crown — which matters, because splitting would double the curve count
  // and quietly double `curveSegments` too.
  const [cy, xRadius, yRadius] = ellipseOf(style, halfSpan, rise);
  const springAngle = Math.atan2(-cy, halfSpan);
  const angle = (end: ArchEnd) =>
    end === "crown" ? Math.PI / 2 : end === "right" ? springAngle : Math.PI - springAngle;

  const start = angle(from);
  const finish = angle(to);
  path.absellipse(x, y + cy, xRadius, yRadius, start, finish, start > finish);
}

/** An ellipse for `elliptical`; the shared circle for `semicircle` / `segmental` / `horseshoe`. */
function ellipseOf(style: ArchStyle, halfSpan: number, rise: number): [cy: number, rx: number, ry: number] {
  if (style === "elliptical") return [0, halfSpan, rise];
  const { radius, cy } = circle(halfSpan, rise);
  return [cy, radius, radius];
}

/** X of a springing (or the crown) relative to the arch's centerline. */
function endX(end: ArchEnd, halfSpan: number): number {
  return end === "crown" ? 0 : end === "right" ? halfSpan : -halfSpan;
}

/**
 * `pointed` and `ogee` are genuinely TWO curves that meet at the apex, so they are traced half at a time.
 * The crown is that meeting point, which is why a half-arch — one leaf of a double door — splits cleanly
 * for these styles too.
 */
function tracePointy(
  path: Path,
  style: "pointed" | "ogee",
  x: number,
  y: number,
  halfSpan: number,
  rise: number,
  from: ArchEnd,
  to: ArchEnd,
): void {
  const order: ArchEnd[] = ["right", "crown", "left"];
  const start = order.indexOf(from);
  const end = order.indexOf(to);
  const step = start < end ? 1 : -1;

  for (let i = start; i !== end; i += step) {
    const a = order[i];
    const b = order[i + step];
    const side: "left" | "right" = a === "left" || b === "left" ? "left" : "right";
    // Each half runs springing → apex; reverse it when the trace is heading the other way.
    const toApex = b === "crown";
    half(path, style, x, y, halfSpan, rise, side, toApex);
  }
}

function half(
  path: Path,
  style: "pointed" | "ogee",
  x: number,
  y: number,
  halfSpan: number,
  rise: number,
  side: "left" | "right",
  toApex: boolean,
): void {
  const sign = side === "right" ? 1 : -1;

  if (style === "pointed") {
    const { offset, radius } = pointedArc(halfSpan, rise);
    const cx = x + sign * offset;
    // The springing sits at angle 0 (or π); the apex wherever the geometry puts it.
    const springAngle = side === "right" ? 0 : Math.PI;
    const apexAngle = Math.atan2(rise, -sign * offset);
    const start = toApex ? springAngle : apexAngle;
    const finish = toApex ? apexAngle : springAngle;
    path.absarc(cx, y, radius, start, finish, start > finish);
    return;
  }

  // Ogee: two quadratics per side, sharing a tangent at the inflection so the S is smooth there. The
  // curve leaves the springing vertically, bulges out, reverses, and arrives at the apex still steep —
  // which is what makes the point a POINT rather than a dome.
  const spring = { x: x + sign * halfSpan, y };
  const apex = { x, y: y + rise };
  const handle = { x: spring.x, y: y + OGEE_SPRING_HANDLE * rise };
  const inflect = { x: x + sign * OGEE_INFLECT_X * halfSpan, y: y + OGEE_INFLECT_Y * rise };
  // Continue straight through the inflection, so the second curve picks up exactly where the first aimed.
  const carry = {
    x: inflect.x + OGEE_TANGENT * (inflect.x - handle.x),
    y: inflect.y + OGEE_TANGENT * (inflect.y - handle.y),
  };

  if (toApex) {
    path.quadraticCurveTo(handle.x, handle.y, inflect.x, inflect.y);
    path.quadraticCurveTo(carry.x, carry.y, apex.x, apex.y);
  } else {
    path.quadraticCurveTo(carry.x, carry.y, inflect.x, inflect.y);
    path.quadraticCurveTo(handle.x, handle.y, spring.x, spring.y);
  }
}
