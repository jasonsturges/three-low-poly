import { BufferGeometry, Plane, Vector3 } from "three";
import { sliceGeometry, type SliceGeometryOptions } from "./SliceGeometry";

/** Closed cuts always produce caps. UV options affect only newly created faces. */
export type ClipGeometryByPlanesOptions = Omit<SliceGeometryOptions, "cap">;
export interface GeometrySection {
  /** Normalized copy in geometry-local coordinates. */
  plane: Plane;
  /** Closed contours without repeated endpoints; includes hole contours. */
  loops: Vector3[][];
  holes: number;
  /** Enclosed section area, subtracting holes, in source units squared. */
  area: number;
}
export interface PlaneGeometryCut extends GeometrySection {
  planeIndex: number;
  /** Reserved by input plane order, even if an earlier cap disappears. */
  capMaterialIndex: number;
}
export interface ClipGeometryByPlanesResult {
  /** Caller-owned retained negative halfspace intersection. May be empty. */
  geometry: BufferGeometry;
  /** Caller-owned positive halves, one per executed cut, including empty halves. */
  offcuts: BufferGeometry[];
  /** Historical sections at each step; later cuts do not update these contours. */
  cuts: PlaneGeometryCut[];
}
function normalizedPlane(plane: Plane): Plane {
  const length = plane.normal.length();
  if (!Number.isFinite(length) || length === 0 || !Number.isFinite(plane.constant))
    throw new RangeError("Plane workflows: expected a finite plane with a nonzero normal.");
  return plane.clone().normalize();
}
/**
 * Extract an independent cross-section of a closed triangle mesh. Source and plane are unchanged.
 * Uses capped slicing internally and disposes its temporary solids. Tangent/coplanar contact follows
 * sliceGeometry's rules; this is not an arbitrary surface-intersection operation.
 */
export function sectionGeometry(
  source: BufferGeometry,
  plane: Plane,
  options: Pick<SliceGeometryOptions, "tolerance"> = {},
): GeometrySection {
  const normalized = normalizedPlane(plane);
  const result = sliceGeometry(source, normalized, { tolerance: options.tolerance, cap: true });
  try {
    return { plane: normalized, loops: result.loops, holes: result.holes, area: result.capArea };
  } finally {
    result.positive.dispose();
    result.negative.dispose();
  }
}
/**
 * Sequentially retain distanceToPoint <= 0 for each plane. Outward planes describe a convex cutting
 * region; the source itself need not be convex. Stops when the retained geometry becomes empty.
 * Preserves source materials, normals and UVs under sliceGeometry's input constraints. New cap
 * indices start above all source materials. All returned geometries belong to the caller.
 * An empty plane list returns an unchanged clone after validating the source and options.
 */
export function clipGeometryByPlanes(
  source: BufferGeometry,
  planes: readonly Plane[],
  options: ClipGeometryByPlanesOptions = {},
): ClipGeometryByPlanesResult {
  const normalized = planes.map(normalizedPlane);
  const firstCap = Math.max(0, ...source.groups.map((g) => g.materialIndex ?? 0)) + 1;
  if (!Number.isSafeInteger(firstCap + Math.max(0, planes.length - 1)))
    throw new RangeError("clipGeometryByPlanes: cap material indices exceed safe integers.");
  if (!normalized.length) {
    // A separating plane exercises the same source/options validation without requiring a cut.
    const positions = source.getAttribute("position");
    let maximum = -Infinity;
    if (positions) for (let i = 0; i < positions.count; i++) maximum = Math.max(maximum, positions.getX(i));
    const probe = sliceGeometry(source, new Plane(new Vector3(1, 0, 0), -maximum), { ...options, cap: true });
    probe.positive.dispose();
    probe.negative.dispose();
  }
  let geometry = source.clone();
  const offcuts: BufferGeometry[] = [],
    cuts: PlaneGeometryCut[] = [];
  try {
    for (const [planeIndex, plane] of normalized.entries()) {
      if (planeIndex > 0 && !geometry.getAttribute("position").count) break;
      const cut = sliceGeometry(geometry, plane, { ...options, cap: true });
      geometry.dispose();
      geometry = cut.negative;
      offcuts.push(cut.positive);
      const capMaterialIndex = firstCap + planeIndex;
      for (const part of [geometry, cut.positive])
        for (const group of part.groups) if (group.materialIndex === cut.capMaterialIndex) group.materialIndex = capMaterialIndex;
      cuts.push({ plane, planeIndex, capMaterialIndex, loops: cut.loops, holes: cut.holes, area: cut.capArea });
    }
    return { geometry, offcuts, cuts };
  } catch (error) {
    geometry.dispose();
    offcuts.forEach((part) => part.dispose());
    throw new Error(`clipGeometryByPlanes: plane ${cuts.length + 1}: ${(error as Error).message}`);
  }
}
