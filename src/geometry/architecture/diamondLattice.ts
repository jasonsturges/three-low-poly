import { BoxGeometry, ExtrudeGeometry, Path, Shape } from "three";

/**
 * Axis-aligned diamond lattice
 */
export interface DiamondLatticeGrid {
  /** Horizontal half-diagonal of each quarrel (east–west point spacing). */
  a: number;
  /** Vertical half-diagonal of each quarrel (north–south point spacing). */
  b: number;
  /**
   * Came angle from +X; the two families run at `+angle` and `−angle`.
   * Equals 45° only when `a === b`.
   */
  angle: number;
  /** Shared perpendicular spacing for both came families. */
  spacing: number;
}

/**
 * Perpendicular distance from the window center to a corner along the diamond
 * grid axis (45° families share this spacing when square).
 */
export function diamondLatticeCornerSpan(width: number, height: number): number {
  return (width / 2 + height / 2) / Math.SQRT2;
}

/**
 * Build an axis-aligned diamond grid from cell counts.
 *
 * `cellsX` quarrels span the width (east–west); `cellsY` span the height.
 * Equal counts on a square opening yield square diamonds; `5×10` elongates them
 * vertically while keeping north/south tips on the same vertical axis.
 */
export function diamondLatticeGridFromCells(
  width: number,
  height: number,
  cellsX: number,
  cellsY: number,
): DiamondLatticeGrid {
  const cx = Math.max(1, Math.round(cellsX));
  const cy = Math.max(1, Math.round(cellsY));
  const a = width / (2 * cx);
  const b = height / (2 * cy);
  return {
    a,
    b,
    angle: Math.atan2(b, a),
    spacing: (2 * a * b) / Math.hypot(a, b),
  };
}

/**
 * Snap cell size so diagonal cames align symmetrically at all four frame edges.
 * Legacy single-spacing helper — prefer {@link diamondLatticeGridFromCells}.
 */
export function fitDiamondLatticeCell(width: number, height: number, preferredCell: number): number {
  const span = diamondLatticeCornerSpan(width, height);
  const count = Math.max(2, Math.round(span / preferredCell));
  return span / count;
}

/** Derive uniform cell size from center-to-corner periods. Legacy — prefer grid counts. */
export function diamondLatticeCellFromCount(width: number, height: number, cellsAcross: number): number {
  const span = diamondLatticeCornerSpan(width, height);
  return span / Math.max(2, cellsAcross);
}

export interface DiamondLatticePartOptions {
  width: number;
  height: number;
  /** Center Y of the opening in local space. Defaults to `0`. */
  centerY?: number;
  grid: DiamondLatticeGrid;
  leadThickness: number;
  leadDepth: number;
}

/**
 * Build merged box geometries for the outer frame and diagonal lead cames.
 * Diagonal bars are trimmed to the rectangular opening (segment clip, not stencil).
 */
export function buildDiamondLatticeParts({
  width,
  height,
  centerY = 0,
  grid,
  leadThickness: barT,
  leadDepth: barD,
}: DiamondLatticePartOptions): BoxGeometry[] {
  const hw = width / 2;
  const hh = height / 2;
  const parts: BoxGeometry[] = [
    new BoxGeometry(width + barT, barT, barD).translate(0, centerY - hh, 0),
    new BoxGeometry(width + barT, barT, barD).translate(0, centerY + hh, 0),
    new BoxGeometry(barT, height + barT, barD).translate(-hw, centerY, 0),
    new BoxGeometry(barT, height + barT, barD).translate(hw, centerY, 0),
  ];

  addDiagonalFamily(parts, width, height, centerY, grid.spacing, barT, barD, grid.angle);
  addDiagonalFamily(parts, width, height, centerY, grid.spacing, barT, barD, -grid.angle);
  return parts;
}

/** Diagonal cames only — no outer frame (for stencil-masked openings). */
export function buildDiamondLatticeCameParts(options: DiamondLatticePartOptions): BoxGeometry[] {
  const { width, height, centerY = 0, grid, leadThickness: barT, leadDepth: barD } = options;
  const parts: BoxGeometry[] = [];
  addDiagonalFamily(parts, width, height, centerY, grid.spacing, barT, barD, grid.angle);
  addDiagonalFamily(parts, width, height, centerY, grid.spacing, barT, barD, -grid.angle);
  return parts;
}

function addDiagonalFamily(
  parts: BoxGeometry[],
  winW: number,
  winH: number,
  winY: number,
  spacing: number,
  barT: number,
  barD: number,
  angle: number,
): void {
  const hw = winW / 2;
  const hh = winH / 2;
  const minX = -hw;
  const maxX = hw;
  const minY = winY - hh;
  const maxY = winY + hh;
  const len = Math.hypot(winW, winH) + barT;
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);
  const count = Math.ceil(Math.hypot(winW, winH) / spacing) + 2;

  for (let i = -count; i <= count; i++) {
    const cx = perpX * i * spacing;
    const cy = winY + perpY * i * spacing;
    const dx = Math.cos(angle) * len * 0.5;
    const dy = Math.sin(angle) * len * 0.5;
    const clipped = clipSegmentToAabb(cx - dx, cy - dy, cx + dx, cy + dy, minX, minY, maxX, maxY);
    if (!clipped) continue;

    const [x1, y1, x2, y2] = clipped;
    const clippedLen = Math.hypot(x2 - x1, y2 - y1);
    if (clippedLen < 1e-6) continue;

    const geo = new BoxGeometry(clippedLen, barT, barD);
    geo.rotateZ(angle);
    geo.translate((x1 + x2) / 2, (y1 + y2) / 2, 0);
    parts.push(geo);
  }
}

/** Clip a segment to an axis-aligned rectangle; returns endpoints inside the opening. */
export function clipSegmentToAabb(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): [number, number, number, number] | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;

  const axes: [number, number, number, number][] = [
    [x1, dx, minX, maxX],
    [y1, dy, minY, maxY],
  ];

  for (const [p, dp, min, max] of axes) {
    if (Math.abs(dp) < 1e-9) {
      if (p < min || p > max) return null;
    } else {
      const a = (min - p) / dp;
      const b = (max - p) / dp;
      tmin = Math.max(tmin, Math.min(a, b));
      tmax = Math.min(tmax, Math.max(a, b));
      if (tmin > tmax) return null;
    }
  }

  return [x1 + dx * tmin, y1 + dy * tmin, x1 + dx * tmax, y1 + dy * tmax];
}

/** Rectangular lower section plus circular arch head. */
export interface ArchedOpeningBounds {
  width: number;
  /** Height of the straight-sided lower section. */
  rectHeight: number;
  /** Arch rise from the spring line to the apex. Defaults to `width / 2` (semicircle). */
  archHeight?: number;
  /** Vertical center of the full opening. Defaults to `0`. */
  centerY?: number;
}

export interface ArchedOpeningMetrics {
  hw: number;
  ymin: number;
  ymax: number;
  rectTopY: number;
  /** Circle center Y — lies on or below the spring line. */
  archCy: number;
  /** Circular arc radius derived from `width` and `archHeight`. */
  archRadius: number;
  archHeight: number;
  totalHeight: number;
  centerY: number;
}

/**
 * Circular arc through `(-width/2, springY)` and `(width/2, springY)` with rise
 * `archHeight`. Frame, glass, and lattice clip all use this same arc.
 */
export function archedOpeningMetrics({
  width,
  rectHeight,
  archHeight = width / 2,
  centerY = 0,
}: ArchedOpeningBounds): ArchedOpeningMetrics {
  const rise = Math.max(archHeight, 1e-6);
  const archRadius = (width * width + 4 * rise * rise) / (8 * rise);
  const totalHeight = rectHeight + rise;
  const ymin = centerY - totalHeight / 2;
  const rectTopY = ymin + rectHeight;
  // Center sits `archRadius − rise` below the spring line (on it for a semicircle,
  // where radius === rise). Getting this sign right is what makes the apex land at
  // `rectTopY + rise` for shallow and tall arches, not just the semicircle case.
  const archCy = rectTopY + rise - archRadius;
  return {
    hw: width / 2,
    ymin,
    ymax: rectTopY + rise,
    rectTopY,
    archCy,
    archRadius,
    archHeight: rise,
    totalHeight,
    centerY,
  };
}

interface ArchedOutlineTarget {
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  absarc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean,
  ): unknown;
  closePath(): unknown;
}

/** Trace the shared rect-plus-arch outline (glass, stencil mask, frame outer edge). */
export function traceArchedOpeningOutline(
  target: ArchedOutlineTarget,
  metrics: ArchedOpeningMetrics,
  { hole = false }: { hole?: boolean } = {},
): void {
  const { hw, ymin, rectTopY, archCy, archRadius } = metrics;
  const angleLeft = Math.atan2(rectTopY - archCy, -hw);
  const angleRight = Math.atan2(rectTopY - archCy, hw);

  if (!hole) {
    target.moveTo(-hw, ymin);
    target.lineTo(hw, ymin);
    target.lineTo(hw, rectTopY);
    // Upper bulge: right spring → left spring, counter-clockwise along the top arc.
    target.absarc(0, archCy, archRadius, angleRight, angleLeft, false);
    target.lineTo(-hw, rectTopY);
    target.closePath();
    return;
  }

  target.moveTo(-hw, ymin);
  target.lineTo(-hw, rectTopY);
  // Hole winds opposite the outer contour — clockwise along the inner top arc.
  target.absarc(0, archCy, archRadius, angleLeft, angleRight, true);
  target.lineTo(hw, rectTopY);
  target.lineTo(hw, ymin);
  target.closePath();
}

/** Inset opening for frame ring inner edge (uniform `inset` wall thickness). */
export function insetArchedOpeningMetrics(
  outer: ArchedOpeningMetrics,
  inset: number,
): ArchedOpeningMetrics {
  const hw = Math.max(outer.hw - inset, inset);
  const ymin = outer.ymin + inset;
  const rectTopY = outer.rectTopY - inset;
  const archHeight = Math.max(outer.archHeight - inset, inset);
  const archRadius = (hw * hw + archHeight * archHeight) / (2 * archHeight);
  const archCy = rectTopY + archHeight - archRadius;
  const ymax = rectTopY + archHeight;
  return {
    hw,
    ymin,
    ymax,
    rectTopY,
    archCy,
    archRadius,
    archHeight,
    totalHeight: ymax - ymin,
    centerY: (ymin + ymax) / 2,
  };
}

const ARCHED_SHAPE_CURVE_SEGMENTS = 48;

/** Extruded frame ring following the arched opening perimeter. */
export function buildArchedDiamondLatticeFrameGeometry(
  metrics: ArchedOpeningMetrics,
  barThickness: number,
  barDepth: number,
): ExtrudeGeometry {
  const outer = new Shape();
  traceArchedOpeningOutline(outer, metrics);

  const inner = new Path();
  traceArchedOpeningOutline(inner, insetArchedOpeningMetrics(metrics, barThickness), { hole: true });
  outer.holes.push(inner);

  const geo = new ExtrudeGeometry(outer, {
    depth: barDepth,
    bevelEnabled: false,
    curveSegments: ARCHED_SHAPE_CURVE_SEGMENTS,
  });
  geo.translate(0, 0, -barDepth / 2);
  return geo;
}

/** Spring-to-apex Y shift that snaps the lattice phase to the rect/arch junction. */
export function diamondLatticeSpringPhaseShift(
  ymin: number,
  rectTopY: number,
  grid: DiamondLatticeGrid,
): number {
  const period = 2 * grid.b;
  const springFromYmin = rectTopY - ymin;
  const snapped = Math.round(springFromYmin / period) * period;
  return snapped - springFromYmin;
}

function pointInsideArchedOpening(
  x: number,
  y: number,
  { hw, ymin, ymax, rectTopY, archCy, archRadius }: ArchedOpeningMetrics,
  eps = 1e-6,
): boolean {
  if (y < ymin - eps || y > ymax + eps) return false;
  if (y <= rectTopY + eps) return Math.abs(x) <= hw + eps;
  const dx = x;
  const dy = y - archCy;
  return dx * dx + dy * dy <= archRadius * archRadius + eps;
}

function collectLineParameterSplits(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  metrics: ArchedOpeningMetrics,
): number[] {
  const ts = new Set<number>([0, 1]);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const { hw, ymin, ymax, rectTopY, archCy, archRadius } = metrics;

  const addIfInterior = (t: number) => {
    if (t > 1e-9 && t < 1 - 1e-9) ts.add(t);
  };

  if (Math.abs(dx) > 1e-9) {
    addIfInterior((-hw - x1) / dx);
    addIfInterior((hw - x1) / dx);
  }
  if (Math.abs(dy) > 1e-9) {
    addIfInterior((ymin - y1) / dy);
    addIfInterior((rectTopY - y1) / dy);
    addIfInterior((ymax - y1) / dy);
  }

  const ax = x1;
  const ay = y1 - archCy;
  const a = dx * dx + dy * dy;
  const b = 2 * (ax * dx + ay * dy);
  const c = ax * ax + ay * ay - archRadius * archRadius;
  const disc = b * b - 4 * a * c;
  if (disc >= 0 && a > 1e-12) {
    const sqrtDisc = Math.sqrt(disc);
    addIfInterior((-b - sqrtDisc) / (2 * a));
    addIfInterior((-b + sqrtDisc) / (2 * a));
  }

  return [...ts].sort((left, right) => left - right);
}

/**
 * Clip a segment to a rect-plus-semicircle opening (analytic, same family as
 * {@link clipSegmentToAabb}).
 */
export function clipSegmentToArchedOpening(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bounds: ArchedOpeningBounds,
): [number, number, number, number] | null {
  const metrics = archedOpeningMetrics(bounds);
  const splits = collectLineParameterSplits(x1, y1, x2, y2, metrics);
  const dx = x2 - x1;
  const dy = y2 - y1;

  // The circle's lower half dips into the rectangular section, so a single line
  // can be split at a circle crossing that isn't a real boundary there. Both
  // sides stay inside, so merge adjacent interior intervals into runs and keep
  // the longest run rather than a single sub-interval (which would truncate the
  // came at the phantom crossing).
  const runs: [number, number][] = [];
  let runStart: number | null = null;
  let runEnd = 0;
  for (let i = 0; i < splits.length - 1; i++) {
    const t0 = splits[i];
    const t1 = splits[i + 1];
    const tm = (t0 + t1) * 0.5;
    const mx = x1 + dx * tm;
    const my = y1 + dy * tm;
    if (pointInsideArchedOpening(mx, my, metrics)) {
      if (runStart === null) runStart = t0;
      runEnd = t1;
    } else if (runStart !== null) {
      runs.push([runStart, runEnd]);
      runStart = null;
    }
  }
  if (runStart !== null) runs.push([runStart, runEnd]);

  let best: [number, number] | null = null;
  let bestLen = 0;
  for (const run of runs) {
    const len = run[1] - run[0];
    if (len > bestLen) {
      bestLen = len;
      best = run;
    }
  }

  if (!best || bestLen < 1e-9) return null;
  const [t0, t1] = best;
  return [x1 + dx * t0, y1 + dy * t0, x1 + dx * t1, y1 + dy * t1];
}

export interface ArchedDiamondLatticePartOptions {
  width: number;
  rectHeight: number;
  archHeight?: number;
  centerY?: number;
  grid: DiamondLatticeGrid;
  leadThickness: number;
  leadDepth: number;
  /**
   * Shrink the opening the cames are clipped to (positioning stays on the full
   * grid). Set to the frame thickness so came ends tuck under the frame ring
   * instead of poking past the outer silhouette. Defaults to `0`.
   */
  clipInset?: number;
}

/** Recover the rect-plus-arch bounds from a metrics object (inverse of {@link archedOpeningMetrics}). */
function boundsFromMetrics(m: ArchedOpeningMetrics): ArchedOpeningBounds {
  return {
    width: 2 * m.hw,
    rectHeight: m.rectTopY - m.ymin,
    archHeight: m.archHeight,
    centerY: m.centerY,
  };
}

function appendArchedFrameHead(
  parts: BoxGeometry[],
  metrics: ArchedOpeningMetrics,
  barT: number,
  barD: number,
): void {
  const { hw, rectTopY, archCy, archRadius: radius } = metrics;
  const angleLeft = Math.atan2(rectTopY - archCy, -hw);
  const angleRight = Math.atan2(rectTopY - archCy, hw);
  const sweep = angleRight - angleLeft;
  const segments = Math.max(12, Math.ceil((Math.abs(sweep) * radius) / (barT * 1.8)));

  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const a0 = angleLeft + sweep * t0;
    const a1 = angleLeft + sweep * t1;
    const mid = (a0 + a1) / 2;
    const chord = 2 * radius * Math.sin((a1 - a0) / 2);
    const geo = new BoxGeometry(chord, barT, barD);
    geo.rotateZ(mid - Math.PI / 2);
    geo.translate(radius * Math.cos(mid), archCy + radius * Math.sin(mid), 0);
    parts.push(geo);
  }
}

/**
 * Diagonal cames only, each segment analytically clipped to the rect-plus-arch
 * opening — no outer frame, no stencil. Bar ends land as real vertices on the
 * arc, so the merged geometry casts a correct shadow and matches any collider.
 */
export function buildArchedDiamondLatticeCameParts({
  width,
  rectHeight,
  archHeight,
  centerY = 0,
  grid,
  leadThickness: barT,
  leadDepth: barD,
  clipInset = 0,
}: ArchedDiamondLatticePartOptions): BoxGeometry[] {
  const bounds: ArchedOpeningBounds = { width, rectHeight, archHeight, centerY };
  const metrics = archedOpeningMetrics(bounds);
  // Positioning (grid phase, line count) follows the full opening so diamonds
  // stay registered; only the clip boundary shrinks so ends land under the frame.
  const clipBounds =
    clipInset > 0 ? boundsFromMetrics(insetArchedOpeningMetrics(metrics, clipInset)) : bounds;
  const parts: BoxGeometry[] = [];

  const phaseShiftY = diamondLatticeSpringPhaseShift(metrics.ymin, metrics.rectTopY, grid);
  addArchedDiagonalFamily(parts, clipBounds, metrics, grid, phaseShiftY, barT, barD, grid.angle);
  addArchedDiagonalFamily(parts, clipBounds, metrics, grid, phaseShiftY, barT, barD, -grid.angle);
  return parts;
}

/** Outer frame (rect sides + circular arch head) and clipped diagonal cames. */
export function buildArchedDiamondLatticeParts(
  options: ArchedDiamondLatticePartOptions,
): BoxGeometry[] {
  const { width, rectHeight, archHeight, centerY = 0, leadThickness: barT, leadDepth: barD } = options;
  const bounds: ArchedOpeningBounds = { width, rectHeight, archHeight, centerY };
  const metrics = archedOpeningMetrics(bounds);
  const { hw, ymin, rectTopY } = metrics;
  const rectSectionHeight = rectTopY - ymin;

  const parts: BoxGeometry[] = [
    new BoxGeometry(width + barT, barT, barD).translate(0, ymin, 0),
    new BoxGeometry(barT, rectSectionHeight + barT, barD).translate(-hw, ymin + rectSectionHeight / 2, 0),
    new BoxGeometry(barT, rectSectionHeight + barT, barD).translate(hw, ymin + rectSectionHeight / 2, 0),
  ];
  appendArchedFrameHead(parts, metrics, barT, barD);
  parts.push(...buildArchedDiamondLatticeCameParts(options));
  return parts;
}

function addArchedDiagonalFamily(
  parts: BoxGeometry[],
  bounds: ArchedOpeningBounds,
  metrics: ArchedOpeningMetrics,
  grid: DiamondLatticeGrid,
  phaseShiftY: number,
  barT: number,
  barD: number,
  angle: number,
): void {
  const { totalHeight, centerY } = metrics;
  const spacing = grid.spacing;
  const len = Math.hypot(bounds.width, totalHeight) + barT;
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);
  const count = Math.ceil(Math.hypot(bounds.width, totalHeight) / spacing) + 2;
  const gridCenterY = centerY + phaseShiftY;

  for (let i = -count; i <= count; i++) {
    const cx = perpX * i * spacing;
    const cy = gridCenterY + perpY * i * spacing;
    const dx = Math.cos(angle) * len * 0.5;
    const dy = Math.sin(angle) * len * 0.5;
    const clipped = clipSegmentToArchedOpening(
      cx - dx,
      cy - dy,
      cx + dx,
      cy + dy,
      bounds,
    );
    if (!clipped) continue;

    const [x1, y1, x2, y2] = clipped;
    const clippedLen = Math.hypot(x2 - x1, y2 - y1);
    if (clippedLen < 1e-6) continue;

    const geo = new BoxGeometry(clippedLen, barT, barD);
    geo.rotateZ(angle);
    geo.translate((x1 + x2) / 2, (y1 + y2) / 2, 0);
    parts.push(geo);
  }
}
