import { Box3, BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { ConvexHull } from "three/addons/math/ConvexHull.js";

export interface BevelConvexGeometryOptions {
  /** Rolling-ball radius in geometry-local units. Zero rebuilds the source triangles without bevels. */
  radius: number;
  /** 1 for chamfers; 2–12 for faceted rounding. Defaults to 3. */
  segments?: number;
}
export interface BevelConvexGeometryResult {
  /** New nonindexed geometry with flat normals. Groups 0/1/2: original faces / edge bands / corners. */
  geometry: BufferGeometry;
  /** Inset-core corners in source coordinates, useful for inspection. */
  core: Vector3[];
  /** Number of source supporting planes after merging coplanar triangles. */
  faces: number;
  /** Triangle counts for original faces, edge bands, and corners, respectively. */
  patches: [number, number, number];
}
type Plane = { n: Vector3; d: number };
/** Rebuild all edges of a closed convex mesh. Source attributes/materials are not transferred. */
export function bevelConvexGeometry(source: BufferGeometry, options: BevelConvexGeometryOptions): BevelConvexGeometryResult {
  let radius = options.radius;
  const segments = options.segments ?? 3;
  if (
    Object.keys(source.morphAttributes).length ||
    Object.keys(source.attributes).some((k) => !["position", "normal", "uv", "color"].includes(k))
  )
    throw new Error("bevelConvexGeometry: morphs, skinning, tangents and custom attributes are unsupported.");
  if (!Number.isFinite(radius) || radius < 0 || !Number.isInteger(segments) || segments < 1 || segments > 12)
    throw new Error("Use a nonnegative radius and 1–12 segments.");
  const p = source.getAttribute("position"),
    index = source.index;
  if (!p || p.itemSize !== 3 || (index?.count ?? p.count) % 3) throw new Error("Expected triangle geometry.");
  const vertices = Array.from({ length: p.count }, (_, i) => new Vector3().fromBufferAttribute(p, i));
  if (!vertices.length || vertices.some((v) => !v.toArray().every(Number.isFinite))) throw new Error("Invalid source positions.");
  const bounds = new Box3().setFromPoints(vertices),
    origin = bounds.getCenter(new Vector3());
  const scale = bounds.getSize(new Vector3()).length();
  if (!(Number.isFinite(scale) && scale > 0)) throw new Error("Invalid source extent.");
  vertices.forEach((v) => v.sub(origin).divideScalar(scale));
  radius /= scale;
  const tolerance = 1e-7;
  if (!Number.isFinite(radius) || (radius > 0 && radius < tolerance * 16))
    throw new Error("Radius is too small for the source extent; use zero or at least 1.6e-6 of the bounding diagonal.");
  const key = (v: Vector3) =>
    v
      .toArray()
      .map((x) => Math.round(x / tolerance))
      .join(",");
  const planes: Plane[] = [],
    edges = new Map<string, number[]>();
  const count = index?.count ?? p.count;
  if (index && index.itemSize !== 1) throw new Error("Expected scalar triangle indices.");
  if (source.drawRange.start !== 0 || (source.drawRange.count !== Infinity && source.drawRange.count !== count))
    throw new Error("Partial draw ranges are unsupported.");
  for (let i = 0; i < count; i += 3) {
    const ids = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
    if (ids.some((j) => !Number.isInteger(j) || !vertices[j])) throw new Error("Invalid source index.");
    const [a, b, c] = ids.map((j) => vertices[j]);
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    if (n.length() <= tolerance * tolerance) throw new Error("Degenerate source triangle.");
    n.normalize();
    const d = n.dot(a);
    if (vertices.some((v) => n.dot(v) > d + tolerance)) throw new Error("Source must be convex with outward winding.");
    if (!planes.some((f) => f.n.distanceTo(n) < 1e-6 && Math.abs(f.d - d) < tolerance)) planes.push({ n, d });
    for (let k = 0; k < 3; k++) {
      const ka = key(vertices[ids[k]]),
        kb = key(vertices[ids[(k + 1) % 3]]);
      const edge = [ka, kb].sort().join("/");
      const uses = edges.get(edge) ?? [];
      uses.push(ka < kb ? 1 : -1);
      edges.set(edge, uses);
    }
  }
  if ([...edges.values()].some((e) => e.length !== 2 || e[0] + e[1] !== 0))
    throw new Error("Source must be a closed two-manifold mesh.");
  if (planes.length < 4 || planes.length > 64) throw new Error("Expected 4–64 distinct supporting planes.");
  const core: Vector3[] = [];
  for (let i = 0; i < planes.length; i++)
    for (let j = i + 1; j < planes.length; j++)
      for (let k = j + 1; k < planes.length; k++) {
        const [a, b, c] = [planes[i], planes[j], planes[k]],
          bc = b.n.clone().cross(c.n),
          determinant = a.n.dot(bc);
        if (Math.abs(determinant) < 1e-9) continue;
        const v = bc
          .multiplyScalar(a.d - radius)
          .addScaledVector(c.n.clone().cross(a.n), b.d - radius)
          .addScaledVector(a.n.clone().cross(b.n), c.d - radius)
          .divideScalar(determinant);
        if (planes.every((f) => f.n.dot(v) <= f.d - radius + tolerance) && !core.some((q) => q.distanceTo(v) < tolerance))
          core.push(v);
      }
  if (core.length < 4 || planes.some((f) => core.filter((v) => Math.abs(f.n.dot(v) - f.d + radius) < tolerance * 4).length < 3))
    throw new Error("Radius consumes a face or collapses the core; reduce it.");
  const finish = (buffers: number[][]): BevelConvexGeometryResult => {
    const geometry = new BufferGeometry().setAttribute("position", new Float32BufferAttribute(buffers.flat(), 3));
    let start = 0;
    buffers.forEach((buffer, i) => {
      geometry.addGroup(start, buffer.length / 3, i);
      start += buffer.length / 3;
    });
    // Validate the actual Float32 output, including welding across independently rendered triangles.
    const output = geometry.getAttribute("position"),
      uses = new Map<string, number[]>();
    const inside = core.reduce((sum, v) => sum.add(v), new Vector3()).divideScalar(core.length);
    try {
      for (let i = 0; i < output.count; i += 3) {
        const tri = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(output, i + k));
        const local = tri.map((v) => v.clone().sub(origin).divideScalar(scale));
        if (local.some((v) => !v.toArray().every(Number.isFinite) || planes.some((f) => f.n.dot(v) > f.d + tolerance * 8)))
          throw new Error("Float32 output exceeds source bounds or precision.");
        const normal = local[1].clone().sub(local[0]).cross(local[2].clone().sub(local[0]));
        if (normal.length() <= 1e-14 || normal.dot(local[0].clone().sub(inside)) <= 0)
          throw new Error("Bevel produces a collapsed or inverted triangle; adjust radius, segments or source coordinates.");
        for (let j = 0; j < 3; j++) {
          const a = tri[j].toArray().join(","),
            b = tri[(j + 1) % 3].toArray().join(",");
          const edge = [a, b].sort().join("/");
          const list = uses.get(edge) ?? [];
          list.push(a < b ? 1 : -1);
          uses.set(edge, list);
        }
      }
      if ([...uses.values()].some((e) => e.length !== 2 || e[0] + e[1] !== 0))
        throw new Error("Bevel output is not a closed two-manifold mesh.");
    } catch (error) {
      geometry.dispose();
      throw error;
    }
    geometry.computeVertexNormals();
    const normals = geometry.getAttribute("normal");
    for (let i = 0; i < normals.count; i++) {
      const n = new Vector3().fromBufferAttribute(normals, i);
      if (!n.toArray().every(Number.isFinite) || n.lengthSq() < 0.5) {
        geometry.dispose();
        throw new Error("Output normals exceed Float32 precision; rescale the source.");
      }
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return {
      geometry,
      core: core.map((v) => v.clone().multiplyScalar(scale).add(origin)),
      faces: planes.length,
      patches: buffers.map((b) => b.length / 9) as [number, number, number],
    };
  };
  const world = (v: Vector3) => v.clone().multiplyScalar(scale).add(origin).toArray();
  if (radius === 0) {
    const positions: number[] = [];
    for (let i = 0; i < count; i++) positions.push(...world(vertices[index ? index.getX(i) : i]));
    return finish([positions, [], []]);
  }
  const samples: Vector3[] = [],
    owners = new Map<Vector3, number>(),
    sampleKeys = new Set<string>();
  const add = (center: Vector3, normal: Vector3, owner: number) => {
    const v = center.clone().addScaledVector(normal.normalize(), radius);
    const id = key(v);
    if (!sampleKeys.has(id)) {
      sampleKeys.add(id);
      samples.push(v);
      owners.set(v, owner);
    }
  };
  core.forEach((v, owner) => {
    const normals = planes.filter((f) => Math.abs(f.n.dot(v) - f.d + radius) < tolerance * 4).map((f) => f.n);
    const axis = normals.reduce((sum, n) => sum.add(n), new Vector3()).normalize();
    const u = normals[0].clone().addScaledVector(axis, -normals[0].dot(axis)).normalize(),
      w = axis.clone().cross(u);
    normals.sort((a, b) => Math.atan2(a.dot(w), a.dot(u)) - Math.atan2(b.dot(w), b.dot(u)));
    // A fan triangulates the normal cone, including corners with more than three incident faces.
    // Shared boundary directions use the same subdivision on either endpoint of each core edge.
    for (let f = 1; f < normals.length - 1; f++) {
      const [a, b, c] = [normals[0], normals[f], normals[f + 1]];
      for (let i = 0; i <= segments; i++)
        for (let j = 0; j <= segments - i; j++)
          add(
            v,
            a
              .clone()
              .multiplyScalar(segments - i - j)
              .addScaledVector(b, i)
              .addScaledVector(c, j),
            owner,
          );
    }
  });
  const hull = new ConvexHull().setFromPoints(samples);
  const buffers: number[][] = [[], [], []];
  for (const face of hull.faces) {
    const triangle = [0, 1, 2].map((k) => face.getEdge(k).head().point);
    const originalFace = planes.some((f) => triangle.every((v) => Math.abs(f.n.dot(v) - f.d) < tolerance * 4));
    const ownersHere = new Set(triangle.map((v) => owners.get(v)));
    const category = originalFace ? 0 : ownersHere.size > 1 ? 1 : 2;
    triangle.forEach((v) => buffers[category].push(...world(v)));
  }
  return finish(buffers);
}
