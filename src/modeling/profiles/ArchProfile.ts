import { Path } from "three";

/**
 * Arch outlines traced between springings and crown.
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
  /** Flat lintel at the springing height. */
  | "square"
  /** Half-circle; rise equals halfSpan. */
  | "semicircle"
  /** Circular arc with rise limited to halfSpan; meets the jamb at an angle. */
  | "segmental"
  /** Circular arc with rise at least halfSpan; can extend beyond the springing span. */
  | "horseshoe"
  /** Elliptical arc with vertical tangents at the springings. */
  | "elliptical"
  /** Two circular arcs meeting at an apex; rise = halfSpan * √3 gives an equilateral arch. */
  | "pointed"
  /** Two tangent-continuous quadratic segments per side, meeting at a pointed crown. */
  | "ogee";

/** Named endpoints for a partial or complete arch trace. */
export type ArchEnd = "left" | "crown" | "right";

export interface ArchProfileOptions {
  /** Arch shape; determines the curve and permitted rise. */
  style?: ArchStyle;
  /** Arch centerline X coordinate. */
  x?: number;
  /** The springing line — the Y where the arch leaves the jambs. */
  y: number;
  /** Half the arch's span. */
  halfSpan: number;
  /** Rise above the springing, in coordinate units; archRise applies style-specific limits. */
  rise?: number;
  /** Endpoint where the existing path ends. */
  from?: ArchEnd;
  /** Endpoint where the appended trace ends. */
  to?: ArchEnd;
}

/** Resolved rise: square 0; semicircle halfSpan; segmental ≤ halfSpan; horseshoe and pointed ≥ halfSpan. */
export function archRise({ style = "elliptical", halfSpan, rise = halfSpan }: ArchProfileOptions): number {
  if (style === "square") return 0;
  if (style === "semicircle") return halfSpan;

  // Style limits meet at the semicircle:
  //
  //   segmental  <--- halfSpan --->  horseshoe
  //              (the semicircle)
  if (style === "segmental") return Math.min(rise, halfSpan);
  if (style === "horseshoe") return Math.max(rise, halfSpan);

  // Below halfSpan, the pointed arcs rise above the apex before meeting it.
  if (style === "pointed") return Math.max(rise, halfSpan);

  return rise;
}

/**
 * Circle through both springings and crown: radius = (halfSpan² + rise²) / (2·rise).
 * Center is below/on/above springing for rise < / = / > halfSpan, respectively.
 */
function circle(halfSpan: number, rise: number): { radius: number; cy: number } {
  const radius = (halfSpan * halfSpan + rise * rise) / (2 * rise);
  return { radius, cy: rise - radius }; // cy is relative to the springing line
}

/**
 * Pointed-arch arc centers lie on the springing line. At rise === halfSpan both arcs form a semicircle;
 * at rise = halfSpan·√3 each center is the opposite springing.
 */
function pointedArc(halfSpan: number, rise: number): { offset: number; radius: number } {
  const offset = (halfSpan * halfSpan - rise * rise) / (2 * halfSpan);
  return { offset, radius: halfSpan - offset };
}

/** Normalized ogee control-point fractions. */
const OGEE_SPRING_HANDLE = 0.4;
const OGEE_INFLECT_X = 0.45;
const OGEE_INFLECT_Y = 0.55;
const OGEE_TANGENT = 0.5;

/**
 * Append an arch to an existing Path whose current point is at from. Jambs remain caller-owned.
 *
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
 * ```ts
 * // Half an arch — one leaf of a double door, split at the crown.
 * traceArch(shape, { style: "ogee", y: h, halfSpan: hw, rise, from: "crown", to: "left" });
 * ```
 */
export function traceArch(path: Path, options: ArchProfileOptions): void {
  const { style = "elliptical", x = 0, y, halfSpan, from = "right", to = "left" } = options;
  const rise = archRise(options);

  if (from === to) return;

  if (style === "square" || rise <= 0) {
    path.lineTo(x + endX(to, halfSpan), y);
    return;
  }

  if (style === "pointed" || style === "ogee") {
    tracePointy(path, style, x, y, halfSpan, rise, from, to);
    return;
  }

  // Keep a single ellipse segment; splitting at the crown changes curve-based sampling density.
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

/** Trace pointed and ogee arches one side at a time, splitting at the crown. */
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

  // Two quadratics share a tangent at the inflection and meet the apex with a nonhorizontal tangent.
  const spring = { x: x + sign * halfSpan, y };
  const apex = { x, y: y + rise };
  const handle = { x: spring.x, y: y + OGEE_SPRING_HANDLE * rise };
  const inflect = { x: x + sign * OGEE_INFLECT_X * halfSpan, y: y + OGEE_INFLECT_Y * rise };
  // Collinear handles preserve the tangent through the inflection.
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
