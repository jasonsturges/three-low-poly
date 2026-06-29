import {
  BoxGeometry,
  ExtrudeGeometry,
  Path,
  Plane,
  Shape,
  Vector3,
} from "three";

/** Portfolio ring-spacing factor — overlap tightens as this approaches 1. */
export const CATHEDRAL_LATTICE_SPACING_FACTOR = 0.96;

/**
 * Four clipping planes for a rectangular opening (shadow + mesh clip).
 * Fragments are discarded when `dot(normal, position) > constant`.
 */
export function createOpeningClippingPlanes(width: number, height: number, centerY = 0): Plane[] {
  const hw = width / 2;
  const hh = height / 2;
  return [
    new Plane(new Vector3(1, 0, 0), hw),
    new Plane(new Vector3(-1, 0, 0), hw),
    new Plane(new Vector3(0, 1, 0), centerY + hh),
    new Plane(new Vector3(0, -1, 0), -centerY + hh),
  ];
}

export interface CathedralLatticeGrid {
  /** Requested ring-center spacing before the overlap factor. */
  cell: number;
  /** Effective center spacing (`cell × 0.96`). */
  latticeCell: number;
  /** Outer half-extent of each square ring profile. */
  ringOuter: number;
  /** Ring instance count. */
  count: number;
}

export interface CathedralLatticeSpotOptions {
  width: number;
  height: number;
  centerY?: number;
  cell: number;
}

/** Resolve uniform ring spacing — `cell` wins over the `cellsX` density hint. */
export function resolveCathedralCell(
  width: number,
  _height: number,
  cell?: number,
  cellsX?: number,
): number {
  if (cell !== undefined) return cell;
  if (cellsX !== undefined) return width / Math.max(1, Math.round(cellsX));
  return 0.55;
}

/** Ring-center positions overscanning the opening (stencil trims the excess). */
export function cathedralLatticeSpots({
  width,
  height,
  centerY = 0,
  cell,
}: CathedralLatticeSpotOptions): { spots: [number, number][]; grid: CathedralLatticeGrid } {
  const latticeCell = cell * CATHEDRAL_LATTICE_SPACING_FACTOR;
  const pad = latticeCell * 0.6;
  const hh = height / 2;
  const hw = width / 2 + pad;

  const xCount = Math.ceil((2 * hw) / latticeCell) + 1;
  const xSpan = (xCount - 1) * latticeCell;
  const xs = Array.from({ length: xCount }, (_, i) => -xSpan / 2 + i * latticeCell);

  const spots: [number, number][] = [];
  const y0 = centerY - hh + latticeCell * 0.5 - pad;
  const y1 = centerY + hh - latticeCell * 0.5 + pad;
  for (let y = y0; y <= y1 + 1e-9; y += latticeCell) {
    for (const x of xs) spots.push([x, y]);
  }

  return {
    spots,
    grid: {
      cell,
      latticeCell,
      ringOuter: latticeCell * 0.5,
      count: spots.length,
    },
  };
}

/** Hollow square profile extruded for one lattice ring (local XY, facing +Z). */
export function createCathedralRingGeometry(outer: number, wall: number, depth: number): ExtrudeGeometry {
  const inner = Math.max(outer - wall, outer * 0.5);
  const ring = new Shape();
  ring.moveTo(-outer, -outer);
  ring.lineTo(outer, -outer);
  ring.lineTo(outer, outer);
  ring.lineTo(-outer, outer);
  ring.closePath();

  const hole = new Path();
  hole.moveTo(-inner, -inner);
  hole.lineTo(-inner, inner);
  hole.lineTo(inner, inner);
  hole.lineTo(inner, -inner);
  hole.closePath();
  ring.holes.push(hole);

  return new ExtrudeGeometry(ring, { depth, bevelEnabled: false });
}

export interface CathedralFramePartOptions {
  width: number;
  height: number;
  centerY?: number;
  frameThickness: number;
  frameDepth: number;
}

/** Outer frame bars — same topology as diamond / Georgian openings. */
export function buildCathedralFrameParts({
  width,
  height,
  centerY = 0,
  frameThickness: barT,
  frameDepth: barD,
}: CathedralFramePartOptions): BoxGeometry[] {
  const hw = width / 2;
  const hh = height / 2;
  return [
    new BoxGeometry(width + barT, barT, barD).translate(0, centerY - hh, 0),
    new BoxGeometry(width + barT, barT, barD).translate(0, centerY + hh, 0),
    new BoxGeometry(barT, height + barT, barD).translate(-hw, centerY, 0),
    new BoxGeometry(barT, height + barT, barD).translate(hw, centerY, 0),
  ];
}

