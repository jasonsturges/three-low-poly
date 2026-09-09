import { Box3, BufferGeometry, Vector3 } from "three";

export interface InspectGeometryOptions {
  /** Weld distance relative to the bounding-box diagonal. Default 1e-6; range [1e-12, 0.001]. */
  tolerance?: number;
}
export interface GeometryInspectionComponent {
  /** Source triangle ordinals belonging to this edge-connected component. */
  triangles: number[];
  /** Closed edges and manifold vertex links, with consistent winding and no duplicate faces. */
  closed: boolean;
  /** Algebraic signed volume of the welded mesh, or null when inconsistent or nonfinite. Not certified occupied volume. */
  signedVolume: number | null;
}
export interface GeometryInspection {
  /** Owned representative positions in geometry-local coordinates. */
  points: Vector3[];
  /** Maps each source position-attribute index to a representative point ID. */
  vertexToPoint: number[];
  /** Welded point IDs in source triangle order, including degenerate triangles. */
  triangles: [number, number, number][];
  /** Component per source triangle; -1 for excluded degenerate triangles. */
  componentOf: number[];
  /** Edges with one nondegenerate triangle use, as point-ID pairs. */
  boundary: [number, number][];
  /** Edges with more than two nondegenerate triangle uses. */
  nonManifold: [number, number][];
  /** Two-use edges traversed in the same direction by both triangles. */
  winding: [number, number][];
  /** Point IDs whose vertex link is not one cycle or boundary chain. */
  nonManifoldVertices: number[];
  /** Source triangle ordinals with repeated welded IDs or negligible normalized area. */
  degenerate: number[];
  /** All source triangle ordinals in duplicate sets, independent of winding. */
  duplicate: number[];
  components: GeometryInspectionComponent[];
  /** Actual weld distance in source units. */
  tolerance: number;
  selfIntersectionsChecked: false;
}
/** Read-only inspection of stored positions and triangles. Does not repair, evaluate morphs/skinning,
 * test intersections, or interpret shell nesting. Other attributes and material groups are ignored.
 */
export function inspectGeometry(source: BufferGeometry, options: InspectGeometryOptions = {}): GeometryInspection {
  const relativeTolerance = options.tolerance ?? 1e-6;
  const p = source.getAttribute("position"),
    index = source.index,
    count = index?.count ?? p?.count ?? 0;
  if (
    !p ||
    p.itemSize !== 3 ||
    !p.count ||
    !count ||
    !Number.isInteger(p.count) ||
    !Number.isInteger(count) ||
    count % 3 ||
    (index && index.itemSize !== 1)
  )
    throw new Error("Expected nonempty triangle geometry.");
  if (!(relativeTolerance >= 1e-12 && relativeTolerance <= 0.001)) throw new Error("Tolerance must be in [1e-12, 0.001].");
  if (source.drawRange.start !== 0 || (source.drawRange.count !== Infinity && source.drawRange.count !== count))
    throw new Error("Partial draw ranges are unsupported.");
  const input = Array.from({ length: p.count }, (_, i) => new Vector3().fromBufferAttribute(p, i));
  if (input.some((v) => !v.toArray().every(Number.isFinite))) throw new Error("Positions must be finite.");
  const box = new Box3().setFromPoints(input),
    origin = box.getCenter(new Vector3()),
    scale = box.getSize(new Vector3()).length();
  if (!Number.isFinite(scale) || scale === 0) throw new Error("Source has no finite extent.");
  const points: Vector3[] = [],
    normalized: Vector3[] = [],
    buckets = new Map<string, number[]>();
  const ids = input.map((v) => {
    const q = v.clone().sub(origin).divideScalar(scale),
      cell = q.toArray().map((x) => Math.floor(x / relativeTolerance));
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const candidates = buckets.get([cell[0] + x, cell[1] + y, cell[2] + z].join(",")) ?? [];
          for (const id of candidates) if (normalized[id].distanceTo(q) <= relativeTolerance) return id;
        }
    const id = points.length,
      key = cell.join(",");
    points.push(v.clone());
    normalized.push(q);
    buckets.set(key, [...(buckets.get(key) ?? []), id]);
    return id;
  });
  const triangles: [number, number, number][] = [],
    degenerate: number[] = [],
    duplicates = new Set<number>();
  const faces = new Map<string, number>(),
    edgeUses = new Map<string, { edge: [number, number]; uses: { face: number; direction: number }[] }>();
  for (let i = 0; i < count; i += 3) {
    const raw = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
    if (raw.some((j) => !Number.isInteger(j) || j < 0 || j >= ids.length)) throw new Error("Invalid triangle index.");
    const tri = raw.map((j) => ids[j]) as [number, number, number],
      f = triangles.length;
    triangles.push(tri);
    const [a, b, c] = tri.map((j) => normalized[j]);
    if (new Set(tri).size < 3 || b.clone().sub(a).cross(c.clone().sub(a)).length() <= relativeTolerance ** 2) {
      degenerate.push(f);
      continue;
    }
    const key = [...tri].sort((a, b) => a - b).join(","),
      prior = faces.get(key);
    if (prior !== undefined) {
      duplicates.add(prior);
      duplicates.add(f);
    } else faces.set(key, f);
    for (let k = 0; k < 3; k++) {
      const a = tri[k],
        b = tri[(k + 1) % 3],
        edge: [number, number] = a < b ? [a, b] : [b, a],
        key = edge.join(",");
      const entry = edgeUses.get(key) ?? { edge, uses: [] };
      entry.uses.push({ face: f, direction: a < b ? 1 : -1 });
      edgeUses.set(key, entry);
    }
  }
  const boundary: [number, number][] = [],
    nonManifold: [number, number][] = [],
    winding: [number, number][] = [];
  const neighbors = triangles.map(() => new Set<number>()),
    badFaces = new Set<number>(duplicates);
  for (const { edge, uses } of edgeUses.values()) {
    if (uses.length === 1) boundary.push(edge);
    else if (uses.length !== 2) nonManifold.push(edge);
    else if (uses[0].direction === uses[1].direction) winding.push(edge);
    if (uses.length !== 2 || uses[0].direction === uses[1]?.direction) uses.forEach((u) => badFaces.add(u.face));
    for (let j = 1; j < uses.length; j++) {
      neighbors[uses[0].face].add(uses[j].face);
      neighbors[uses[j].face].add(uses[0].face);
    }
  }
  // Vertex links must be a single cycle (interior) or a single chain (boundary).
  const links = points.map(() => [] as [number, number][]),
    incident = points.map(() => [] as number[]),
    degSet = new Set(degenerate);
  triangles.forEach((tri, f) => {
    if (!degSet.has(f))
      tri.forEach((v, k) => {
        links[v].push([tri[(k + 1) % 3], tri[(k + 2) % 3]]);
        incident[v].push(f);
      });
  });
  const nonManifoldVertices: number[] = [];
  links.forEach((edges, v) => {
    if (!edges.length) return;
    const adjacency = new Map<number, number[]>();
    edges.forEach(([a, b]) => {
      adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
      adjacency.set(b, [...(adjacency.get(b) ?? []), a]);
    });
    const seen = new Set<number>(),
      stack = [edges[0][0]];
    while (stack.length) {
      const n = stack.pop()!;
      if (seen.has(n)) continue;
      seen.add(n);
      for (const next of adjacency.get(n)!) stack.push(next);
    }
    const degrees = [...adjacency.values()].map((x) => x.length),
      ends = degrees.filter((d) => d === 1).length;
    if (seen.size !== adjacency.size || degrees.some((d) => d > 2) || (ends !== 0 && ends !== 2)) {
      nonManifoldVertices.push(v);
      incident[v].forEach((f) => badFaces.add(f));
    }
  });
  const componentOf = triangles.map(() => -1),
    components: GeometryInspection["components"] = [];
  for (let f = 0; f < triangles.length; f++) {
    if (degSet.has(f) || componentOf[f] !== -1) continue;
    const members: number[] = [],
      stack = [f],
      id = components.length;
    while (stack.length) {
      const at = stack.pop()!;
      if (componentOf[at] !== -1) continue;
      componentOf[at] = id;
      members.push(at);
      for (const next of neighbors[at]) stack.push(next);
    }
    const reference = normalized[triangles[f][0]],
      closed = members.every((i) => !badFaces.has(i));
    let volume = 0;
    for (const i of members) {
      const [a, b, c] = triangles[i].map((v) => normalized[v].clone().sub(reference));
      volume += a.dot(b.cross(c)) / 6;
    }
    const signed = volume * scale ** 3;
    components.push({ triangles: members, closed, signedVolume: closed && Number.isFinite(signed) ? signed : null });
  }
  return {
    points,
    vertexToPoint: ids,
    triangles,
    componentOf,
    boundary,
    nonManifold,
    winding,
    nonManifoldVertices,
    degenerate,
    duplicate: [...duplicates],
    components,
    tolerance: relativeTolerance * scale,
    selfIntersectionsChecked: false,
  };
}
