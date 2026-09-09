import { BufferGeometry, Plane, Vector3 } from "three";
import { inspectGeometry, type GeometryInspection } from "./InspectGeometry";
import { sliceGeometry, type SliceCapUVOptions } from "./SliceGeometry";

export interface ConvexEdge {
  /** Endpoints in ConvexEdgeTopology.points. Edges are original mesh segments, not merged polylines. */
  a: number;
  b: number;
  normals: [Vector3, Vector3];
  /** Angle between outward incident face normals in radians. */
  angle: number;
}
export interface ConvexEdgeTopology {
  points: Vector3[];
  /** Array index is the edge ID, valid only for this source's unchanged position/index buffers. */
  edges: ConvexEdge[];
}
export interface ChamferConvexGeometryOptions {
  /** Nonnegative face setback in geometry-local units, not rolling-ball radius. */
  width: number;
  /** Explicit original edge IDs returned by convexEdges. Empty selects nothing; duplicates are removed. */
  edgeIds: readonly number[];
  /** Projection policy for new chamfer faces; forwarded to slicing. */
  capUV?: SliceCapUVOptions;
}
export interface ChamferConvexGeometryResult extends ConvexEdgeTopology {
  geometry: BufferGeometry;
  report: GeometryInspection;
  selected: number[];
  /** Shared material index for new chamfers; existing source group indices are retained. */
  chamferMaterialIndex: number;
}
/** Geometric edge topology of one outward closed convex triangle mesh. Coplanar diagonals are excluded. */
export function convexEdges(source: BufferGeometry): ConvexEdgeTopology {
  const r = inspectGeometry(source);
  if (
    r.degenerate.length ||
    r.duplicate.length ||
    r.components.length !== 1 ||
    !r.components[0].closed ||
    !(r.components[0].signedVolume! > 0)
  )
    throw new Error("Expected one outward closed solid.");
  const map = new Map<string, { a: number; b: number; normals: Vector3[] }>();
  for (const tri of r.triangles) {
    const [a, b, c] = tri.map((i) => r.points[i]),
      n = b.clone().sub(a).divideScalar(r.tolerance).cross(c.clone().sub(a).divideScalar(r.tolerance)).normalize();
    if (r.points.some((p) => p.clone().sub(a).dot(n) > r.tolerance * 4)) throw new Error("convexEdges requires a convex source.");
    for (let k = 0; k < 3; k++) {
      const a = Math.min(tri[k], tri[(k + 1) % 3]),
        b = Math.max(tri[k], tri[(k + 1) % 3]),
        key = `${a},${b}`;
      const e = map.get(key) ?? { a, b, normals: [] };
      e.normals.push(n);
      map.set(key, e);
    }
  }
  return {
    points: r.points,
    edges: [...map.values()]
      .filter((e) => e.normals.length === 2 && e.normals[0].dot(e.normals[1]) < 1 - 1e-6)
      .map((e) => ({
        ...e,
        normals: e.normals as [Vector3, Vector3],
        angle: Math.acos(Math.max(-1, Math.min(1, e.normals[0].dot(e.normals[1])))),
      })),
  };
}

/** Sequential plane chamfers on selected original edges of a convex solid. Not rounded beveling.
 * Retains the intersection of the selected halfspaces; large widths can remove unrelated features.
 */
export function chamferConvexGeometry(
  source: BufferGeometry,
  options: ChamferConvexGeometryOptions,
): ChamferConvexGeometryResult {
  const { width, edgeIds, capUV } = options;
  if (!Number.isFinite(width) || width < 0) throw new RangeError("Width must be finite and nonnegative.");
  if (!Array.isArray(edgeIds)) throw new RangeError("Explicit edgeIds are required.");
  if (
    Object.keys(source.morphAttributes).length ||
    Object.keys(source.attributes).some((k) => !["position", "normal", "uv"].includes(k))
  )
    throw new RangeError("Only position, normal and uv attributes are supported; no morphs.");
  const topology = convexEdges(source),
    { edges, points } = topology;
  if (edgeIds.some((id) => !Number.isInteger(id) || id < 0 || id >= edges.length))
    throw new RangeError("Invalid original edge ID.");
  const selected = [...new Set(edgeIds)].sort((a, b) => a - b);
  // Run slicing's attribute/group/option validation even for a no-op, using a tangent supporting plane.
  let maximumX = -Infinity;
  points.forEach((p) => {
    maximumX = Math.max(maximumX, p.x);
  });
  const probe = sliceGeometry(source, new Plane(new Vector3(1, 0, 0), -maximumX), { capUV });
  probe.positive.dispose();
  probe.negative.dispose();
  let maximumMaterial = 0;
  source.groups.forEach((g) => {
    maximumMaterial = Math.max(maximumMaterial, g.materialIndex ?? 0);
  });
  const chamferMaterialIndex = maximumMaterial + 1;
  if (!Number.isSafeInteger(chamferMaterialIndex)) throw new RangeError("No safe material index remains for chamfers.");
  let geometry = source.clone();
  if (!geometry.groups.length) geometry.addGroup(0, geometry.index?.count ?? geometry.getAttribute("position").count, 0);
  try {
    if (width > 0)
      for (const id of selected) {
        const e = edges[id],
          normal = e.normals[0].clone().add(e.normals[1]).normalize();
        const setback = width * Math.sin(e.angle / 2);
        const cut = sliceGeometry(geometry, new Plane(normal, -normal.dot(points[e.a]) + setback), { capUV });
        cut.positive.dispose();
        geometry.dispose();
        geometry = cut.negative;
        geometry.groups.forEach((g) => {
          if (g.materialIndex === cut.capMaterialIndex) g.materialIndex = chamferMaterialIndex;
        });
        if (!geometry.getAttribute("position").count) throw new Error("Width consumes the solid; reduce it.");
      }
    const report = inspectGeometry(geometry);
    if (
      report.degenerate.length ||
      report.components.length !== 1 ||
      !report.components[0].closed ||
      !(report.components[0].signedVolume! > 0)
    )
      throw new Error("Result failed closed-solid inspection.");
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return { geometry, report, selected, chamferMaterialIndex, ...topology };
  } catch (error) {
    geometry.dispose();
    throw error;
  }
}
