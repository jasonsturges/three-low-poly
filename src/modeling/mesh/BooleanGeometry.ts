import { Box3, BufferGeometry, Float32BufferAttribute, Vector2, Vector3 } from "three";
import { inspectGeometry, type GeometryInspection } from "./InspectGeometry";

/** Bounded BSP Boolean operations on closed triangle meshes. */
export type BooleanOperation = "Union" | "Intersection" | "Subtract";
export interface BooleanGeometryOptions {
  /** Default throw disposes output that fails topology checks; report returns it for inspection. */
  onInvalid?: "throw" | "report";
  /** Optional operand colors. Otherwise A indices are preserved and B indices are offset above A. */
  materialIndices?: { a: number; b: number };
}
export interface BooleanGeometryResult {
  /** Caller-owned geometry, possibly empty. Inputs remain unchanged. */
  geometry: BufferGeometry;
  /** Add this to B's source material indices. Null when materialIndices overrides both operands. */
  materialOffsetB: number | null;
  diagnostics: {
    /** Closure, winding, degeneracy and volume checks only; not a global solid certificate. */
    topologyValid: boolean;
    /** Null for an empty result. */
    inspection: GeometryInspection | null;
    selfIntersectionsChecked: false;
  };
}
const EPS = 1e-6;
type Vertex = { p: Vector3; n: Vector3; uv: Vector2 };
type Polygon = { vertices: Vertex[]; normal: Vector3; w: number; material: number };
const copyVertex = (v: Vertex): Vertex => ({ p: v.p.clone(), n: v.n.clone(), uv: v.uv.clone() });
function polygon(vertices: Vertex[], material: number): Polygon | null {
  const clean = vertices.filter(
    (v, i) => v.p.distanceToSquared(vertices[(i + vertices.length - 1) % vertices.length].p) > EPS * EPS,
  );
  if (clean.length < 3) return null;
  const normal = new Vector3();
  for (let i = 1; i < clean.length - 1; i++) {
    normal.crossVectors(clean[i].p.clone().sub(clean[0].p), clean[i + 1].p.clone().sub(clean[0].p));
    if (normal.lengthSq() > EPS ** 4) break;
  }
  if (normal.lengthSq() <= EPS ** 4) return null;
  normal.normalize();
  return { vertices: clean, normal, w: normal.dot(clean[0].p), material };
}
class Tree {
  normal?: Vector3;
  w = 0;
  faces: Polygon[] = [];
  front?: Tree;
  back?: Tree;
  constructor(
    private budget: { splits: number },
    polygons: Polygon[] = [],
    depth = 0,
  ) {
    this.build(polygons, depth);
  }
  split(face: Polygon, coplanarFront: Polygon[], coplanarBack: Polygon[], front: Polygon[], back: Polygon[]) {
    if (++this.budget.splits > 2000000) throw new Error("BSP split budget exceeded; use simpler operands.");
    const distances = face.vertices.map((v) => this.normal!.dot(v.p) - this.w);
    const types = distances.map((d) => (d > EPS ? 1 : d < -EPS ? 2 : 0));
    const type = types.reduce<number>((a, b) => a | b, 0);
    if (type === 0) {
      (this.normal!.dot(face.normal) >= 0 ? coplanarFront : coplanarBack).push(face);
      return;
    }
    if (type === 1) {
      front.push(face);
      return;
    }
    if (type === 2) {
      back.push(face);
      return;
    }
    const f: Vertex[] = [],
      b: Vertex[] = [];
    for (let i = 0; i < face.vertices.length; i++) {
      const j = (i + 1) % face.vertices.length,
        a = face.vertices[i],
        next = face.vertices[j];
      if (types[i] !== 2) f.push(copyVertex(a));
      if (types[i] !== 1) b.push(copyVertex(a));
      if ((types[i] | types[j]) === 3) {
        const t = distances[i] / (distances[i] - distances[j]);
        const v = {
          p: a.p.clone().lerp(next.p, t),
          n: a.n.clone().lerp(next.n, t).normalize(),
          uv: a.uv.clone().lerp(next.uv, t),
        };
        f.push(v);
        b.push(copyVertex(v));
      }
    }
    const fp = polygon(f, face.material),
      bp = polygon(b, face.material);
    if (fp) front.push(fp);
    if (bp) back.push(bp);
  }
  build(polygons: Polygon[], depth = 0) {
    if (!polygons.length) return;
    if (depth > 180) throw new Error("BSP depth limit exceeded; use simpler operands.");
    if (!this.normal) {
      this.normal = polygons[0].normal.clone();
      this.w = polygons[0].w;
    }
    const front: Polygon[] = [],
      back: Polygon[] = [];
    for (const p of polygons) this.split(p, this.faces, this.faces, front, back);
    if (front.length) {
      this.front ??= new Tree(this.budget);
      this.front.build(front, depth + 1);
    }
    if (back.length) {
      this.back ??= new Tree(this.budget);
      this.back.build(back, depth + 1);
    }
  }
  clip(polygons: Polygon[]): Polygon[] {
    if (!this.normal) return polygons;
    let front: Polygon[] = [],
      back: Polygon[] = [];
    for (const p of polygons) this.split(p, front, back, front, back);
    if (this.front) front = this.front.clip(front);
    back = this.back ? this.back.clip(back) : [];
    return front.concat(back);
  }
  clipTo(other: Tree) {
    this.faces = other.clip(this.faces);
    this.front?.clipTo(other);
    this.back?.clipTo(other);
  }
  invert() {
    for (const p of this.faces) {
      p.vertices.reverse();
      p.vertices.forEach((v) => v.n.negate());
      p.normal.negate();
      p.w = -p.w;
    }
    this.normal?.negate();
    this.w = -this.w;
    this.front?.invert();
    this.back?.invert();
    [this.front, this.back] = [this.back, this.front];
  }
  all(): Polygon[] {
    return this.faces.concat(this.front?.all() ?? [], this.back?.all() ?? []);
  }
}
function validateInput(g: BufferGeometry): void {
  const positions = g.getAttribute("position");
  const count = g.index?.count ?? positions?.count ?? 0;
  if (!positions || positions.itemSize !== 3 || !positions.count || count % 3 || count > 4500)
    throw new RangeError("booleanGeometry: expected 1–1500 complete input triangles per operand.");
  if (
    Object.keys(g.attributes).some((k) => !["position", "normal", "uv"].includes(k)) ||
    Object.keys(g.morphAttributes).length ||
    g.drawRange.start !== 0 ||
    (g.drawRange.count !== Infinity && g.drawRange.count !== count)
  )
    throw new RangeError("booleanGeometry: only complete position/normal/UV meshes are supported.");
  for (const name of ["position", "normal", "uv"] as const) {
    const attribute = g.getAttribute(name);
    if (!attribute) continue;
    const size = name === "uv" ? 2 : 3;
    if (attribute.itemSize !== size || attribute.count !== positions.count)
      throw new RangeError("booleanGeometry: mismatched attribute size/count.");
    for (let i = 0; i < attribute.count; i++) {
      for (let j = 0; j < size; j++)
        if (!Number.isFinite(attribute.getComponent(i, j))) throw new RangeError("booleanGeometry: nonfinite attribute.");
      if (name === "normal" && Math.hypot(attribute.getX(i), attribute.getY(i), attribute.getZ(i)) === 0)
        throw new RangeError("booleanGeometry: zero source normal.");
    }
  }
  let end = 0;
  for (const group of [...g.groups].sort((a, b) => a.start - b.start)) {
    if (
      !Number.isInteger(group.start) ||
      !Number.isInteger(group.count) ||
      group.start < end ||
      group.count <= 0 ||
      group.start % 3 ||
      group.count % 3 ||
      group.start + group.count > count ||
      !Number.isSafeInteger(group.materialIndex ?? 0) ||
      (group.materialIndex ?? 0) < 0
    )
      throw new RangeError("booleanGeometry: invalid or overlapping material groups.");
    end = group.start + group.count;
  }
  const report = inspectGeometry(g);
  if (
    !report.components.length ||
    !cleanTopology(report) ||
    report.components.some((c) => c.signedVolume === null || c.signedVolume <= 0)
  )
    throw new Error(
      "booleanGeometry: operands must be closed, outward-wound, nondegenerate shells; inward cavity shells are unsupported as inputs.",
    );
}
function cleanTopology(report: GeometryInspection): boolean {
  return (
    !report.boundary.length &&
    !report.winding.length &&
    !report.nonManifold.length &&
    !report.nonManifoldVertices.length &&
    !report.degenerate.length &&
    !report.duplicate.length &&
    report.components.every((c) => c.closed && c.signedVolume !== null)
  );
}
function inputPolygons(g: BufferGeometry, materialAt: (triangleOffset: number) => number, center: Vector3, scale: number) {
  const positions = g.getAttribute("position"),
    normals = g.getAttribute("normal"),
    uv = g.getAttribute("uv");
  const result: Polygon[] = [];
  for (let i = 0; i < (g.index?.count ?? positions.count); i += 3) {
    const vertices = [0, 1, 2].map((k) => {
      const j = g.index ? g.index.getX(i + k) : i + k;
      return {
        p: new Vector3().fromBufferAttribute(positions, j).sub(center).divideScalar(scale),
        n: normals ? new Vector3().fromBufferAttribute(normals, j).normalize() : new Vector3(),
        uv: uv ? new Vector2(uv.getX(j), uv.getY(j)) : new Vector2(),
      };
    });
    const p = polygon(vertices, materialAt(i));
    if (p) {
      if (!normals) p.vertices.forEach((v) => v.n.copy(p.normal));
      result.push(p);
    }
  }
  return result;
}
function render(polygons: Polygon[], center: Vector3, scale: number) {
  if (polygons.length > 12000) throw new Error("booleanGeometry: polygon limit exceeded.");
  // Splits on one face can terminate on a neighboring unsplit edge. Insert those shared
  // boundary vertices before triangulating, avoiding render-only T-junctions.
  const points = new Map<string, Vector3>();
  const key = (p: Vector3) =>
    p
      .toArray()
      .map((v) => Math.round(v / EPS))
      .join(":");
  polygons.forEach((p) =>
    p.vertices.forEach((v) => {
      if (!points.has(key(v.p))) points.set(key(v.p), v.p);
    }),
  );
  const candidates = [...points.values()];
  if (candidates.length * polygons.reduce((s, p) => s + p.vertices.length, 0) > 12000000)
    throw new Error("booleanGeometry: boundary reconciliation budget exceeded.");
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [];
  const geometry = new BufferGeometry();
  for (const face of polygons.sort((a, b) => a.material - b.material)) {
    const ring: Vertex[] = [];
    for (let i = 0; i < face.vertices.length; i++) {
      const a = face.vertices[i],
        b = face.vertices[(i + 1) % face.vertices.length],
        edge = b.p.clone().sub(a.p),
        length = edge.lengthSq();
      const hits = [{ t: 0, p: a.p }];
      for (const p of candidates) {
        const t = p.clone().sub(a.p).dot(edge) / length;
        if (t > EPS && t < 1 - EPS && a.p.clone().addScaledVector(edge, t).distanceToSquared(p) < EPS * EPS) hits.push({ t, p });
      }
      hits.sort((x, y) => x.t - y.t);
      for (const hit of hits)
        if (!ring.length || ring[ring.length - 1].p.distanceToSquared(hit.p) > EPS * EPS)
          ring.push({ p: hit.p.clone(), n: a.n.clone().lerp(b.n, hit.t).normalize(), uv: a.uv.clone().lerp(b.uv, hit.t) });
    }
    if (ring.length > 1 && ring[0].p.distanceToSquared(ring[ring.length - 1].p) <= EPS * EPS) ring.pop();
    if (ring.length < 3) continue;
    const middle: Vertex = { p: new Vector3(), n: new Vector3(), uv: new Vector2() };
    ring.forEach((v) => {
      middle.p.add(v.p);
      middle.n.add(v.n);
      middle.uv.add(v.uv);
    });
    middle.p.divideScalar(ring.length);
    middle.n.normalize();
    middle.uv.divideScalar(ring.length);
    const start = positions.length / 3;
    for (let i = 0; i < ring.length; i++)
      for (const v of [middle, ring[i], ring[(i + 1) % ring.length]]) {
        positions.push(...v.p.clone().multiplyScalar(scale).add(center).toArray());
        normals.push(...(v.n.lengthSq() ? v.n : face.normal).toArray());
        uvs.push(v.uv.x, v.uv.y);
      }
    const count = positions.length / 3 - start;
    const previous = geometry.groups[geometry.groups.length - 1];
    if (previous?.materialIndex === face.material) previous.count += count;
    else geometry.addGroup(start, count, face.material);
  }
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  return geometry;
}
/**
 * Union, intersection or A-minus-B in a shared geometry-local frame. No external CSG dependency.
 * A bounded, tolerance-based BSP solver for small meshes (1500 triangles per input), not exact CSG.
 * Empty results are supported; empty inputs and inward cavity shells as inputs are rejected.
 * Output normals/UVs interpolate source attributes; new cavity faces inherit B and reverse winding.
 * Caller disposes result.geometry. Default failure mode never returns known-invalid topology.
 */
export function booleanGeometry(
  a: BufferGeometry,
  b: BufferGeometry,
  operation: BooleanOperation,
  { onInvalid = "throw", materialIndices }: BooleanGeometryOptions = {},
): BooleanGeometryResult {
  if (!["Union", "Intersection", "Subtract"].includes(operation)) throw new RangeError("booleanGeometry: unknown operation.");
  if (!["throw", "report"].includes(onInvalid)) throw new RangeError("booleanGeometry: invalid onInvalid mode.");
  if (materialIndices && ![materialIndices.a, materialIndices.b].every((i) => Number.isSafeInteger(i) && i >= 0))
    throw new RangeError("booleanGeometry: invalid operand material indices.");
  validateInput(a);
  validateInput(b);
  const materialOffsetB = materialIndices ? null : Math.max(0, ...a.groups.map((g) => g.materialIndex ?? 0)) + 1;
  if (
    materialOffsetB !== null &&
    !Number.isSafeInteger(materialOffsetB + Math.max(0, ...b.groups.map((g) => g.materialIndex ?? 0)))
  )
    throw new RangeError("booleanGeometry: material indices exceed safe integers.");
  const materialAt = (source: BufferGeometry, offset: number, override?: number) => (i: number) =>
    override ?? (source.groups.find((g) => i >= g.start && i < g.start + g.count)?.materialIndex ?? 0) + offset;
  const bounds = new Box3();
  for (const g of [a, b]) {
    const p = g.getAttribute("position");
    if (!p) throw new Error("Missing positions.");
    for (let i = 0; i < p.count; i++) bounds.expandByPoint(new Vector3().fromBufferAttribute(p, i));
  }
  const center = bounds.getCenter(new Vector3()),
    scale = bounds.getSize(new Vector3()).length();
  if (!Number.isFinite(scale) || scale <= 0) throw new Error("Invalid operand extent.");
  const budget = { splits: 0 },
    left = new Tree(budget, inputPolygons(a, materialAt(a, 0, materialIndices?.a), center, scale)),
    right = new Tree(budget, inputPolygons(b, materialAt(b, materialOffsetB ?? 0, materialIndices?.b), center, scale));
  if (operation === "Union") {
    left.clipTo(right);
    right.clipTo(left);
    right.invert();
    right.clipTo(left);
    right.invert();
    left.build(right.all());
  } else if (operation === "Subtract") {
    left.invert();
    left.clipTo(right);
    right.clipTo(left);
    right.invert();
    right.clipTo(left);
    right.invert();
    left.build(right.all());
    left.invert();
  } else {
    left.invert();
    right.clipTo(left);
    right.invert();
    left.clipTo(right);
    right.clipTo(left);
    left.build(right.all());
    left.invert();
  }
  const geometry = render(left.all(), center, scale);
  try {
    for (const name of ["position", "normal", "uv"] as const) {
      const attribute = geometry.getAttribute(name);
      for (let i = 0; i < attribute.count; i++)
        for (let j = 0; j < attribute.itemSize; j++)
          if (!Number.isFinite(attribute.getComponent(i, j)))
            throw new Error("booleanGeometry: output exceeds finite Float32 storage.");
    }
    const inspection = geometry.getAttribute("position").count ? inspectGeometry(geometry) : null;
    const topologyValid =
      inspection === null ||
      (cleanTopology(inspection) && inspection.components.reduce((sum, c) => sum + (c.signedVolume ?? 0), 0) > 0);
    if (!topologyValid && onInvalid === "throw")
      throw new Error("booleanGeometry: result failed topology validation; use onInvalid: report to inspect it.");
    return { geometry, materialOffsetB, diagnostics: { topologyValid, inspection, selfIntersectionsChecked: false } };
  } catch (error) {
    geometry.dispose();
    throw error;
  }
}
