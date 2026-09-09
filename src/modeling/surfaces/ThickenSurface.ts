import { BufferGeometry, Float32BufferAttribute, Vector2, Vector3 } from "three";

/** An oriented triangle sheet. Shared point indices define connectivity, independently of shading. */
export interface IndexedSurface {
  readonly points: readonly Vector3[];
  readonly triangles: readonly (readonly [number, number, number])[];
  /** Optional per-point UVs. Without them, each skin triangle receives a unit triangle mapping. */
  readonly uv?: readonly Vector2[];
}

export interface RimUVOptions {
  /** Omit for the existing 0–1 loop fit; positive value uses source boundary distance per repeat. */
  unitsPerRepeat?: number;
  /** Texture-coordinate offset, applied independently to each boundary loop. */
  offset?: Vector2;
}
export interface ThickenSurfaceOptions {
  /** Mapping of new rim walls only. Front/back retain caller UVs. */
  rimUV?: RimUVOptions;
  /** Positive distance in the input coordinate system. */
  thickness: number;
  /** Defaults to centered. Front follows input winding; back faces the opposite way. */
  placement?: "front" | "centered" | "back";
  /**
   * Normal uses angle-weighted unit vertex normals. Crease compensation fits incident face-plane
   * distances along that normal, and is approximate on general meshes. A vector is normalized and
   * used as a fixed extrusion direction; it must point into every source face's front hemisphere.
   */
  offset?: "normal" | "crease-compensated" | Vector3;
  /**
   * Throw on detected output inversions, collapsed triangles or nonpositive component volumes
   * (default). Report returns that geometry for inspection. Invalid input always throws.
   * Neither mode detects global self-intersections.
   */
  onInvalid?: "throw" | "report";
}

export interface ThicknessDiagnostics {
  /** Source boundary edges, including hole boundaries. */
  boundaryEdges: number;
  /** Front/back output triangles facing against their corresponding source orientation. */
  invertedFaces: number;
  /** Collapsed or numerically degenerate output triangles, including walls. */
  degenerateFaces: number;
  /** Closed output components with zero or negative signed volume. */
  nonPositiveVolumeComponents: number;
  /** Sum of component signed volumes, in input units cubed. */
  signedVolume: number;
  /** Maximum corresponding-vertex displacement error projected on an incident source normal. */
  maxFaceThicknessError: number;
  /** Explicitly not a solid-validity certificate. */
  selfIntersectionsChecked: false;
}

export interface ThickenSurfaceResult {
  /** Owned nonindexed geometry. Groups 0, 1, 2 are front, back, and rim; caller disposes it. */
  geometry: BufferGeometry;
  diagnostics: ThicknessDiagnostics;
}

type Face = readonly [number, number, number];
type Edge = { a: number; b: number; faces: number[]; balance: number };
const EPS = 1e-12;
const fail = (message: string): never => {
  throw new RangeError(`thickenSurface: ${message}`);
};
const finite = (p: Vector3) => p && [p.x, p.y, p.z].every(Number.isFinite);
const normalOf = (points: readonly Vector3[], [a, b, c]: Face) =>
  points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a]));

/**
 * Convert an open rectangular grid to an owned indexed sheet, grid[v][u]. No seam welding,
 * periodic wrapping, or collapsed rows are inferred. Degenerate faces are rejected by thickenSurface.
 */
export function surfaceFromGrid(
  grid: readonly (readonly Vector3[])[],
  { flip = false }: { flip?: boolean } = {},
): IndexedSurface {
  const rows = grid.length,
    columns = grid[0]?.length ?? 0;
  if (rows < 2 || columns < 2 || grid.some((row) => row.length !== columns)) {
    fail("grid must be rectangular with at least two rows and columns.");
  }
  const points: Vector3[] = [],
    uv: Vector2[] = [],
    triangles: Face[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < columns; i++) {
      if (!finite(grid[j][i])) fail("grid coordinates must be finite.");
      points.push(grid[j][i].clone());
      uv.push(new Vector2(i / (columns - 1), j / (rows - 1)));
    }
  for (let j = 0; j < rows - 1; j++)
    for (let i = 0; i < columns - 1; i++) {
      const a = j * columns + i,
        b = a + 1,
        d = a + columns,
        c = d + 1;
      triangles.push(
        ...((flip
          ? [
              [a, c, b],
              [a, d, c],
            ]
          : [
              [a, b, c],
              [a, c, d],
            ]) as Face[]),
      );
    }
  return { points, triangles, uv };
}

/**
 * Add thickness to an explicitly connected, consistently oriented, manifold open sheet.
 * Disconnected open components and holes are supported. Closed components, bow-tie vertices,
 * unused points, degenerate/duplicate faces and inconsistent winding are rejected.
 *
 * Connectivity comes from point indices, never position welding. Offsets are computed on that
 * topology, then rendering corners are duplicated for flat normals and UV seams. Front/back UVs
 * retain the source map; rim UVs run 0–1 around each boundary loop and from back (0) to front (1).
 *
 * Normal and crease offsets may self-intersect or consume narrow features. Output diagnostics
 * detect local inversions and degeneracy after Float32 conversion, not global intersections.
 * Keep coordinates near the origin when small features would otherwise lose Float32 precision.
 *
 * @example
 * const { geometry, diagnostics } = thickenSurface(surfaceFromGrid(grid), {
 *   thickness: 0.08, placement: "centered", offset: "normal",
 * });
 * const mesh = new Mesh(geometry, [frontMaterial, backMaterial, rimMaterial]);
 */
export function thickenSurface(
  surface: IndexedSurface,
  { thickness, placement = "centered", offset = "normal", onInvalid = "throw", rimUV = {} }: ThickenSurfaceOptions,
): ThickenSurfaceResult {
  if (!Number.isFinite(thickness) || thickness <= 0) fail("thickness must be positive and finite.");
  if (!["front", "centered", "back"].includes(placement)) fail("unknown placement.");
  if (!["throw", "report"].includes(onInvalid)) fail("unknown onInvalid policy.");
  const rimUnits = rimUV.unitsPerRepeat,
    rimOffset = rimUV.offset ?? new Vector2();
  if (
    (rimUnits !== undefined && !(Number.isFinite(rimUnits) && rimUnits > 0)) ||
    ![rimOffset.x, rimOffset.y].every(Number.isFinite)
  )
    fail("invalid rim UV options.");
  const fixed = typeof offset !== "string";
  if (fixed ? !finite(offset) || offset.length() === 0 : !["normal", "crease-compensated"].includes(offset))
    fail("invalid offset.");
  if (surface.points.length < 3 || !surface.triangles.length || surface.points.some((p) => !finite(p)))
    fail("expected finite points and triangles.");
  if (
    surface.uv &&
    (surface.uv.length !== surface.points.length || surface.uv.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)))
  )
    fail("UVs must be finite and match the points.");

  // Work in a local, scale-normalized frame for direction and degeneracy calculations.
  const origin = surface.points[0].clone();
  let scale = 0;
  for (const p of surface.points) scale = Math.max(scale, p.distanceTo(origin));
  if (!(scale > 0) || !Number.isFinite(scale) || !Number.isFinite(thickness / scale)) fail("unsupported coordinate extent.");
  const points = surface.points.map((p) => p.clone().sub(origin).divideScalar(scale));
  const faces = surface.triangles;
  const incident = points.map(() => [] as number[]);
  const edges = new Map<string, Edge>();
  const unique = new Set<string>();
  const normals: Vector3[] = [];
  faces.forEach((face, f) => {
    if (face.length !== 3 || face.some((i) => !Number.isInteger(i) || i < 0 || i >= points.length) || new Set(face).size !== 3)
      fail("invalid triangle indices.");
    const key = [...face].sort((a, b) => a - b).join(":");
    if (unique.has(key)) fail("duplicate face.");
    unique.add(key);
    const n = normalOf(points, face);
    const longest = Math.max(...face.map((a, i) => points[a].distanceToSquared(points[face[(i + 1) % 3]])));
    if (n.length() <= EPS * longest) fail("degenerate source triangle.");
    normals.push(n.normalize());
    face.forEach((a, i) => {
      incident[a].push(f);
      const b = face[(i + 1) % 3],
        key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      const e = edges.get(key) ?? { a, b, faces: [], balance: 0 };
      e.faces.push(f);
      e.balance += a < b ? 1 : -1;
      edges.set(key, e);
    });
  });
  if (incident.some((list) => !list.length)) fail("unused point.");
  const boundary: Edge[] = [],
    neighbors = faces.map(() => [] as number[]);
  const vertexEdges = points.map(() => [] as Edge[]);
  for (const e of edges.values()) {
    if (e.faces.length > 2 || (e.faces.length === 2 && e.balance !== 0)) fail("expected consistently oriented manifold edges.");
    vertexEdges[e.a].push(e);
    vertexEdges[e.b].push(e);
    if (e.faces.length === 1) boundary.push(e);
    else {
      neighbors[e.faces[0]].push(e.faces[1]);
      neighbors[e.faces[1]].push(e.faces[0]);
    }
  }
  // Edge manifoldness alone misses two fans touching at a single vertex.
  incident.forEach((list, v) => {
    const edgeList = vertexEdges[v],
      ends = edgeList.filter((e) => e.faces.length === 1).length;
    if (ends !== 0 && ends !== 2) fail("non-manifold boundary vertex.");
    const graph = new Map(list.map((f) => [f, [] as number[]]));
    for (const e of edgeList)
      if (e.faces.length === 2) {
        graph.get(e.faces[0])!.push(e.faces[1]);
        graph.get(e.faces[1])!.push(e.faces[0]);
      }
    const seen = new Set<number>(),
      stack = [list[0]];
    while (stack.length) {
      const f = stack.pop()!;
      if (!seen.has(f)) {
        seen.add(f);
        stack.push(...graph.get(f)!);
      }
    }
    if (seen.size !== list.length) fail("disconnected face fans at a vertex.");
  });
  const component = faces.map(() => -1),
    componentOrigins: Vector3[] = [];
  faces.forEach((face, start) => {
    if (component[start] !== -1) return;
    const id = componentOrigins.length;
    componentOrigins.push(surface.points[face[0]].clone());
    const stack = [start];
    while (stack.length) {
      const f = stack.pop()!;
      if (component[f] === -1) {
        component[f] = id;
        stack.push(...neighbors[f]);
      }
    }
  });
  const openComponents = new Set(boundary.map((e) => component[e.faces[0]]));
  if (openComponents.size !== componentOrigins.length) fail("each component must be an open sheet.");

  const fixedDirection = fixed ? (offset as Vector3).clone().normalize() : null;
  if (fixedDirection && normals.some((n) => n.dot(fixedDirection) <= EPS))
    fail("extrusion direction must point into every source face's front hemisphere.");
  let maxFaceThicknessError = 0;
  const offsets = incident.map((list, v) => {
    const weights = list.map((f) => {
      const face = faces[f],
        k = face.indexOf(v);
      const a = points[face[(k + 1) % 3]].clone().sub(points[v]).normalize();
      const b = points[face[(k + 2) % 3]].clone().sub(points[v]).normalize();
      return Math.atan2(a.clone().cross(b).length(), a.dot(b));
    });
    const d = fixedDirection?.clone() ?? new Vector3();
    if (!fixedDirection) {
      list.forEach((f, k) => d.addScaledVector(normals[f], weights[k]));
      if (d.length() <= EPS) fail("undefined offset normal.");
      d.normalize();
      if (list.some((f) => normals[f].dot(d) <= EPS)) fail("offset direction folds behind an incident face.");
      if (offset === "crease-compensated") {
        let numerator = 0,
          denominator = 0;
        list.forEach((f, k) => {
          const dot = normals[f].dot(d);
          numerator += weights[k] * dot;
          denominator += weights[k] * dot * dot;
        });
        d.multiplyScalar(numerator / denominator);
      }
    }
    list.forEach((f) => {
      maxFaceThicknessError = Math.max(maxFaceThicknessError, Math.abs(d.dot(normals[f]) - 1) * thickness);
    });
    return d;
  });
  const location = placement === "front" ? -1 : placement === "back" ? 1 : 0;
  const front = surface.points.map((p, i) => p.clone().addScaledVector(offsets[i], (thickness * (location + 1)) / 2));
  const back = surface.points.map((p, i) => p.clone().addScaledVector(offsets[i], (thickness * (location - 1)) / 2));
  const positions: number[] = [],
    uvs: number[] = [],
    faceComponents: number[] = [];
  const emit = (corners: Vector3[], coords: readonly Vector2[], id: number) => {
    corners.forEach((p, i) => {
      positions.push(p.x, p.y, p.z);
      uvs.push(coords[i].x, coords[i].y);
    });
    faceComponents.push(id);
  };
  const defaultUV = [new Vector2(0, 0), new Vector2(1, 0), new Vector2(0, 1)];
  faces.forEach((face, f) =>
    emit(
      face.map((i) => front[i]),
      surface.uv ? face.map((i) => surface.uv![i]) : defaultUV,
      component[f],
    ),
  );
  faces.forEach((face, f) =>
    emit(
      [...face].reverse().map((i) => back[i]),
      [...(surface.uv ? face.map((i) => surface.uv![i]) : defaultUV)].reverse(),
      component[f],
    ),
  );
  // Each oriented manifold boundary has exactly one outgoing edge per boundary vertex.
  const outgoing = new Map(boundary.map((e) => [e.a, e]));
  const visited = new Set<Edge>();
  for (const first of boundary) {
    if (visited.has(first)) continue;
    const loop: Edge[] = [];
    let e = first;
    do {
      loop.push(e);
      visited.add(e);
      e = outgoing.get(e.b)!;
    } while (e !== first);
    const lengths = loop.map((e) => points[e.a].distanceTo(points[e.b]));
    const perimeter = lengths.reduce((a, b) => a + b, 0);
    let distance = 0;
    loop.forEach((e, i) => {
      const u0 = rimUnits === undefined ? distance / perimeter : (distance * scale) / rimUnits;
      distance += lengths[i];
      const u1 = rimUnits === undefined ? distance / perimeter : (distance * scale) / rimUnits;
      const a = new Vector2(u0, rimUnits === undefined ? 1 : front[e.a].distanceTo(back[e.a]) / rimUnits).add(rimOffset),
        b = new Vector2(u1, rimUnits === undefined ? 1 : front[e.b].distanceTo(back[e.b]) / rimUnits).add(rimOffset),
        c = new Vector2(u0, 0).add(rimOffset),
        d = new Vector2(u1, 0).add(rimOffset);
      emit([front[e.b], front[e.a], back[e.a]], [b, a, c], component[e.faces[0]]);
      emit([front[e.b], back[e.a], back[e.b]], [b, c, d], component[e.faces[0]]);
    });
  }
  if (uvs.some((v) => !Number.isFinite(Math.fround(v)))) fail("UVs exceed Float32 range.");
  const geometry = new BufferGeometry();
  const buffer = new Float32BufferAttribute(positions, 3);
  if (Array.from(buffer.array).some((n) => !Number.isFinite(n))) fail("output exceeds Float32 coordinate range.");
  geometry.setAttribute("position", buffer);
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.addGroup(0, faces.length * 3, 0);
  geometry.addGroup(faces.length * 3, faces.length * 3, 1);
  geometry.addGroup(faces.length * 6, boundary.length * 6, 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  let invertedFaces = 0,
    degenerateFaces = 0;
  const volumes = componentOrigins.map(() => 0);
  for (let f = 0; f < faceComponents.length; f++) {
    const id = faceComponents[f],
      base = componentOrigins[id];
    const p = [0, 1, 2].map((k) =>
      new Vector3()
        .fromBufferAttribute(buffer, f * 3 + k)
        .sub(base)
        .divideScalar(scale),
    );
    const n = normalOf(p, [0, 1, 2]);
    const longest = Math.max(p[0].distanceToSquared(p[1]), p[1].distanceToSquared(p[2]), p[2].distanceToSquared(p[0]));
    if (n.length() <= EPS * longest) degenerateFaces++;
    if (f < faces.length * 2 && n.dot(normals[f % faces.length]) * (f < faces.length ? 1 : -1) <= 0) invertedFaces++;
    volumes[id] += p[0].dot(n) / 6;
  }
  const diagnostics: ThicknessDiagnostics = {
    boundaryEdges: boundary.length,
    invertedFaces,
    degenerateFaces,
    nonPositiveVolumeComponents: volumes.filter((v) => v <= 0).length,
    signedVolume: volumes.reduce((a, b) => a + b, 0) * scale ** 3,
    maxFaceThicknessError,
    selfIntersectionsChecked: false,
  };
  if (onInvalid === "throw" && (invertedFaces || degenerateFaces || diagnostics.nonPositiveVolumeComponents)) {
    geometry.dispose();
    fail(
      `invalid offset (${invertedFaces} inverted, ${degenerateFaces} degenerate faces, ${diagnostics.nonPositiveVolumeComponents} nonpositive components); reduce thickness or use onInvalid: "report" to inspect.`,
    );
  }
  return { geometry, diagnostics };
}
