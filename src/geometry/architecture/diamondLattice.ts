import { BoxGeometry } from "three";

/**
 * Axis-aligned diamond lattice — north/south vertices share a vertical axis,
 * east/west share a horizontal axis (`<>` not `><`).
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

/** @deprecated Use {@link diamondLatticeGridFromCells}. */
export function diamondLatticeSpacingFromGrid(
  width: number,
  height: number,
  cellsX: number,
  cellsY: number,
): { plus45: number; minus45: number } {
  const grid = diamondLatticeGridFromCells(width, height, cellsX, cellsY);
  return { plus45: grid.spacing, minus45: grid.spacing };
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