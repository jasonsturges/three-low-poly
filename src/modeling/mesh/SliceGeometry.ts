import { Box3, BufferGeometry, Float32BufferAttribute, Plane, ShapeUtils, Vector2, Vector3 } from "three";

export interface SliceCapUVOptions {
  /** Units keeps planar distances; fit maps the combined cap bounds to 0–1. Default units. */
  mode?: "units" | "fit";
  /** Positive source units per repeat in units mode. Default 1. */
  unitsPerRepeat?: number;
  /** Rotation in the cap plane, in radians. Default 0. */
  rotation?: number;
  offset?: Vector2;
}
export interface SliceGeometryOptions {
  /** Only new caps; both halves share the same mapping. Existing UVs are interpolated unchanged. */
  capUV?: SliceCapUVOptions;
  /** Seal both cut surfaces. Defaults to true. */
  cap?: boolean;
  /** Relative to the source bounding-box diagonal. Default 1e-7; range (0, 0.001]. */
  tolerance?: number;
}
export interface SliceGeometryResult {
  /** Owned geometry on the positive side; empty when no solid remains there. */
  positive: BufferGeometry;
  /** Owned geometry on the negative side. */
  negative: BufferGeometry;
  /** Cut contours in input coordinates, without repeated endpoints. */
  loops: Vector3[][];
  /** Number of odd-depth hole contours. */
  holes: number;
  /** New cap area on one half, in source units squared. Zero if caps are disabled. */
  capArea: number;
  /** One greater than the largest input material index (1 when the input is ungrouped). */
  capMaterialIndex: number;
  diagnostics: {
    /** Source triangles below the area tolerance, including collapsed primitive poles. */
    discardedDegenerateTriangles: number;
    selfIntersectionsChecked: false;
  };
}
type Corner = { p: Vector3; n: Vector3; uv: Vector2 };
type Face = { v: Corner[]; material: number };

function validateAttributes(source: BufferGeometry): void {
  const position = source.getAttribute("position");
  if (!position || position.itemSize !== 3 || !position.count)
    throw new RangeError("sliceGeometry: expected nonempty positions.");
  if (
    Object.keys(source.morphAttributes).length ||
    Object.keys(source.attributes).some((k) => !["position", "normal", "uv"].includes(k))
  )
    throw new RangeError("sliceGeometry: only position, normal and uv attributes are supported.");
  for (const name of ["position", "normal", "uv"] as const) {
    const attribute = source.getAttribute(name);
    if (!attribute) continue;
    const size = name === "uv" ? 2 : 3;
    if (attribute.itemSize !== size || attribute.count !== position.count)
      throw new RangeError("sliceGeometry: mismatched attribute size/count.");
    for (let i = 0; i < attribute.count; i++) {
      if (![attribute.getX(i), attribute.getY(i), ...(size === 3 ? [attribute.getZ(i)] : [])].every(Number.isFinite))
        throw new RangeError("sliceGeometry: nonfinite attribute.");
      if (name === "normal" && Math.hypot(attribute.getX(i), attribute.getY(i), attribute.getZ(i)) === 0)
        throw new RangeError("sliceGeometry: zero source normal.");
    }
  }
  const index = source.index,
    count = index?.count ?? position.count;
  if (count % 3 || (index && index.itemSize !== 1)) throw new RangeError("sliceGeometry: expected triangle indices.");
  if (index)
    for (let i = 0; i < count; i++) {
      const n = index.getX(i);
      if (!Number.isInteger(n) || n < 0 || n >= position.count) throw new RangeError("sliceGeometry: invalid index.");
    }
  if (source.drawRange.start !== 0 || (source.drawRange.count !== Infinity && source.drawRange.count !== count))
    throw new RangeError("sliceGeometry: partial draw ranges are unsupported.");
  const ranges = [...source.groups].sort((a, b) => a.start - b.start);
  let end = 0;
  for (const g of ranges) {
    if (
      !Number.isInteger(g.start) ||
      !Number.isInteger(g.count) ||
      g.start % 3 ||
      g.count % 3 ||
      g.start < end ||
      g.count <= 0 ||
      g.start + g.count > count ||
      !Number.isSafeInteger(g.materialIndex ?? 0) ||
      (g.materialIndex ?? 0) < 0
    )
      throw new RangeError("sliceGeometry: invalid or overlapping material groups.");
    end = g.start + g.count;
  }
}

/** Geometric adjacency across shading seams, with directed edge cancellation. */
function validateEdges(faces: Vector3[][], key: (p: Vector3) => string, openPlane: Plane | null, epsilon = 0): void {
  const edges = new Map<string, { count: number; balance: number; a: Vector3; b: Vector3 }>();
  for (const face of faces)
    for (let i = 0; i < 3; i++) {
      const a = face[i],
        b = face[(i + 1) % 3],
        ka = key(a),
        kb = key(b);
      if (ka === kb) throw new RangeError("sliceGeometry: feature collapsed at tolerance.");
      const id = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`,
        edge = edges.get(id) ?? { count: 0, balance: 0, a, b };
      edge.count++;
      edge.balance += ka < kb ? 1 : -1;
      edges.set(id, edge);
    }
  for (const e of edges.values()) {
    if (e.count === 2 && e.balance === 0) continue;
    if (
      e.count === 1 &&
      openPlane &&
      Math.abs(openPlane.distanceToPoint(e.a)) <= epsilon &&
      Math.abs(openPlane.distanceToPoint(e.b)) <= epsilon
    )
      continue;
    throw new RangeError("sliceGeometry: open, non-manifold or inconsistently wound mesh at the selected tolerance.");
  }
}

/** Reject touching/crossing loops before assigning nesting depth. */
function validateContours(loops: Vector2[][], epsilon: number): void {
  const segments = loops.flatMap((loop, l) => loop.map((a, i) => ({ a, b: loop[(i + 1) % loop.length], l, i })));
  const cross = (a: Vector2, b: Vector2, p: Vector2) => b.clone().sub(a).cross(p.clone().sub(a));
  const on = (a: Vector2, b: Vector2, p: Vector2) =>
    Math.abs(cross(a, b, p)) <= epsilon * a.distanceTo(b) &&
    p.x >= Math.min(a.x, b.x) - epsilon &&
    p.x <= Math.max(a.x, b.x) + epsilon &&
    p.y >= Math.min(a.y, b.y) - epsilon &&
    p.y <= Math.max(a.y, b.y) + epsilon;
  for (let i = 0; i < segments.length; i++)
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i],
        b = segments[j];
      if (a.l === b.l && ((a.i + 1) % loops[a.l].length === b.i || (b.i + 1) % loops[a.l].length === a.i)) continue;
      const ab = cross(a.a, a.b, b.a),
        ac = cross(a.a, a.b, b.b),
        ba = cross(b.a, b.b, a.a),
        bc = cross(b.a, b.b, a.b);
      if ((ab * ac < 0 && ba * bc < 0) || on(a.a, a.b, b.a) || on(a.a, a.b, b.b) || on(b.a, b.b, a.a) || on(b.a, b.b, a.b))
        throw new RangeError("sliceGeometry: cut contours cross or touch.");
    }
}

/**
 * Split a closed, consistently outward-wound triangle mesh in local coordinates.
 * Positive means plane.normal.dot(point) + plane.constant >= 0. Caps face out of each half.
 * Supports indexed/nonindexed positions, normals, UVs and material groups. Other attributes,
 * morph data and partial draw ranges are rejected rather than silently discarded.
 *
 * Input and plane are not mutated. Owned output is nonindexed; callers dispose both geometries.
 * Contours include holes and separate islands, without a repeated closing point. Coplanar exterior
 * faces stay with the solid behind their outward normal; tangent cuts do not create duplicate caps.
 *
 * Uses a relative geometric tolerance, not exact predicates. Touching/branching contours and detected
 * topology failures throw. Global self-intersections are not checked; successful output is not a
 * general solid-validity certificate. Keep small features near the origin for Float32 precision.
 */
export function sliceGeometry(
  source: BufferGeometry,
  cuttingPlane: Plane,
  { cap = true, tolerance = 1e-7, capUV = {} }: SliceGeometryOptions = {},
): SliceGeometryResult {
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 1e-3)
    throw new RangeError("sliceGeometry: tolerance must be in (0, 0.001].");
  const uvMode = capUV.mode ?? "units",
    uvUnits = capUV.unitsPerRepeat ?? 1,
    uvRotation = capUV.rotation ?? 0,
    uvOffset = capUV.offset ?? new Vector2();
  if (
    !["units", "fit"].includes(uvMode) ||
    !(Number.isFinite(uvUnits) && uvUnits > 0) ||
    ![uvRotation, uvOffset.x, uvOffset.y].every(Number.isFinite)
  )
    throw new RangeError("sliceGeometry: invalid cap UV options.");
  validateAttributes(source);
  const position = source.getAttribute("position"),
    normals = source.getAttribute("normal"),
    uv = source.getAttribute("uv");
  if (
    !position ||
    !Number.isFinite(cuttingPlane.constant) ||
    !Number.isFinite(cuttingPlane.normal.length()) ||
    cuttingPlane.normal.length() === 0
  )
    throw new Error("Invalid geometry or plane.");
  const bounds = new Box3();
  for (let i = 0; i < position.count; i++) bounds.expandByPoint(new Vector3().fromBufferAttribute(position, i));
  const origin = bounds.getCenter(new Vector3()),
    scale = bounds.getSize(new Vector3()).length();
  if (!(scale > 0) || !Number.isFinite(scale)) throw new Error("Invalid geometry extent.");
  const normal = cuttingPlane.normal.clone().normalize();
  const plane = new Plane(normal, (cuttingPlane.constant / cuttingPlane.normal.length() + normal.dot(origin)) / scale);
  const epsilon = tolerance;
  const key = (p: Vector3) => [p.x, p.y, p.z].map((v) => Math.round(v / epsilon)).join(":");
  const canonical = new Map<string, Vector3>();
  const onPlane = (p: Vector3) => {
    const projected = plane.projectPoint(p, new Vector3()),
      id = key(projected);
    if (!canonical.has(id)) canonical.set(id, projected);
    return canonical.get(id)!.clone();
  };
  const index = source.index,
    count = index?.count ?? position.count;
  if (count % 3) throw new Error("Expected triangles.");
  const inputFaces: Vector3[][] = [];
  let discardedDegenerateTriangles = 0;
  const halves: Face[][] = [[], []];
  const area = (v: Corner[]) => v[1].p.clone().sub(v[0].p).cross(v[2].p.clone().sub(v[0].p)).length();
  const emit = (out: Face[], v: Corner[], material: number) => {
    for (let i = 1; i < v.length - 1; i++) {
      const tri = [v[0], v[i], v[i + 1]];
      if (area(tri) > epsilon * epsilon) out.push({ v: tri, material });
    }
  };
  for (let at = 0; at < count; at += 3) {
    const vertices = [0, 1, 2].map((k) => {
      const i = index ? index.getX(at + k) : at + k;
      const p = new Vector3().fromBufferAttribute(position, i).sub(origin).divideScalar(scale);
      if (!p.toArray().every(Number.isFinite)) throw new Error("Nonfinite source coordinates.");
      if (Math.abs(plane.distanceToPoint(p)) <= epsilon) p.copy(onPlane(p));
      return {
        p,
        n: normals ? new Vector3().fromBufferAttribute(normals, i).normalize() : new Vector3(),
        uv: uv ? new Vector2(uv.getX(i), uv.getY(i)) : new Vector2(),
      };
    });
    if (area(vertices) <= epsilon * epsilon) {
      discardedDegenerateTriangles++;
      continue;
    }
    inputFaces.push(vertices.map((v) => v.p));
    const faceNormal = vertices[1].p.clone().sub(vertices[0].p).cross(vertices[2].p.clone().sub(vertices[0].p)).normalize();
    if (!normals) vertices.forEach((v) => v.n.copy(faceNormal));
    const material = source.groups.find((g) => at >= g.start && at < g.start + g.count)?.materialIndex ?? 0;
    const distances = vertices.map((v) => plane.distanceToPoint(v.p));
    if (distances.every((d) => Math.abs(d) <= epsilon)) {
      emit(halves[faceNormal.dot(normal) > 0 ? 1 : 0], vertices, material);
      continue;
    }
    for (let half = 0; half < 2; half++) {
      const sign = half === 0 ? 1 : -1,
        polygon: Corner[] = [];
      for (let k = 0; k < 3; k++) {
        const a = vertices[k],
          b = vertices[(k + 1) % 3],
          da = distances[k] * sign,
          db = distances[(k + 1) % 3] * sign;
        if (da >= -epsilon) polygon.push(a);
        if ((da > epsilon && db < -epsilon) || (da < -epsilon && db > epsilon)) {
          const t = da / (da - db);
          polygon.push({
            p: onPlane(a.p.clone().lerp(b.p, t)),
            n: a.n.clone().lerp(b.n, t).normalize(),
            uv: a.uv.clone().lerp(b.uv, t),
          });
        }
      }
      const clean = polygon.filter((v, i) => i === 0 || v.p.distanceToSquared(polygon[i - 1].p) > epsilon * epsilon);
      if (clean.length > 1 && clean[0].p.distanceToSquared(clean[clean.length - 1].p) <= epsilon * epsilon) clean.pop();
      emit(halves[half], clean, material);
    }
  }
  validateEdges(inputFaces, key, null);
  if (!inputFaces.length) throw new RangeError("sliceGeometry: no nondegenerate source faces.");
  const inputVolume = inputFaces.reduce((sum, [a, b, c]) => sum + a.dot(b.clone().cross(c)) / 6, 0);
  if (!(inputVolume > 0)) throw new RangeError("sliceGeometry: source must have positive outward signed volume.");
  // Find the actual open boundary of the clipped skin. This handles cuts through existing edges
  // and coplanar exterior faces without adding duplicate caps.
  const boundary = (faces: Face[]) => {
    const edges = new Map<string, { a: Vector3; b: Vector3; count: number; balance: number }>();
    for (const face of faces)
      for (let i = 0; i < 3; i++) {
        const a = face.v[i].p,
          b = face.v[(i + 1) % 3].p;
        if (Math.abs(plane.distanceToPoint(a)) > epsilon * 2 || Math.abs(plane.distanceToPoint(b)) > epsilon * 2) continue;
        const ka = key(a),
          kb = key(b);
        if (ka === kb) continue;
        const id = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`,
          e = edges.get(id) ?? { a, b, count: 0, balance: 0 };
        e.count++;
        e.balance += ka < kb ? 1 : -1;
        edges.set(id, e);
      }
    if ([...edges.values()].some((e) => e.count > 2 || (e.count === 2 && e.balance !== 0)))
      throw new Error("Ambiguous plane boundary: non-manifold or inconsistent winding.");
    return [...edges.values()].filter((e) => e.count === 1);
  };
  const edges = boundary(halves[0]),
    negativeEdges = boundary(halves[1]);
  const edgeId = (a: Vector3, b: Vector3) => [key(a), key(b)].sort().join("|");
  const negativeIds = new Set(negativeEdges.map((e) => edgeId(e.a, e.b)));
  if (edges.length !== negativeEdges.length || edges.some((e) => !negativeIds.has(edgeId(e.a, e.b))))
    throw new RangeError("sliceGeometry: halves have inconsistent cut boundaries.");
  const outgoing = new Map<string, (typeof edges)[number]>(),
    incoming = new Map<string, number>();
  for (const e of edges) {
    if (outgoing.has(key(e.a))) throw new Error("Contours touch or branch at a cut vertex. Move the plane slightly.");
    outgoing.set(key(e.a), e);
    incoming.set(key(e.b), (incoming.get(key(e.b)) ?? 0) + 1);
  }
  if (edges.some((e) => !outgoing.has(key(e.b)) || incoming.get(key(e.a)) !== 1))
    throw new Error("Open cut contour; source may not be closed.");
  const loops: Vector3[][] = [],
    visited = new Set<(typeof edges)[number]>();
  for (const start of edges) {
    if (visited.has(start)) continue;
    const loop: Vector3[] = [];
    let e = start;
    do {
      if (visited.has(e)) throw new Error("Ambiguous contour cycle.");
      visited.add(e);
      loop.push(e.a);
      e = outgoing.get(key(e.b))!;
    } while (e !== start);
    if (loop.length < 3) throw new Error("Collapsed cut loop.");
    loops.push(loop);
  }
  const seed = Math.abs(normal.x) < 0.8 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const u = seed.addScaledVector(normal, -seed.dot(normal)).normalize(),
    v = normal.clone().cross(u);
  const contours = loops.map((loop) => loop.map((p) => new Vector2(p.dot(u), p.dot(v))));
  validateContours(contours, epsilon);
  const inside = (p: Vector2, loop: Vector2[]) => {
    let hit = false;
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const a = loop[i],
        b = loop[j];
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
    }
    return hit;
  };
  const parents = contours.map((loop, i) => {
    let parent = -1,
      best = Infinity;
    contours.forEach((other, j) => {
      const a = Math.abs(ShapeUtils.area(other));
      if (i !== j && a > Math.abs(ShapeUtils.area(loop)) && a < best && inside(loop[0], other)) {
        parent = j;
        best = a;
      }
    });
    return parent;
  });
  const depth = (i: number): number => (parents[i] === -1 ? 0 : 1 + depth(parents[i]));
  const capMaterialIndex = Math.max(0, ...source.groups.map((g) => g.materialIndex ?? 0)) + 1;
  let capArea = 0;
  if (cap)
    contours.forEach((contour, i) => {
      if (depth(i) % 2) return;
      const holes = contours.filter((_, j) => parents[j] === i),
        world = [...loops[i], ...loops.filter((_, j) => parents[j] === i).flat()];
      // ShapeUtils can omit collinear boundary points. Subdivide each cap triangle's boundary edges
      // at those points, then fan around an interior centroid to avoid T-junctions in the final shell.
      const all = [...contour, ...holes.flat()];
      let base = 0;
      const simplified = [contour, ...holes].map((loop) => {
        const ids = loop.map((_, k) => base + k);
        base += loop.length;
        let changed = true;
        while (changed && ids.length > 3) {
          changed = false;
          for (let k = 0; k < ids.length; k++) {
            const a = all[ids[(k + ids.length - 1) % ids.length]],
              b = all[ids[k]],
              c = all[ids[(k + 1) % ids.length]],
              ac = c.clone().sub(a),
              ab = b.clone().sub(a);
            if (Math.abs(ab.cross(ac)) <= epsilon * ac.length() && ab.dot(ac) >= 0 && ab.dot(ac) <= ac.lengthSq()) {
              ids.splice(k, 1);
              changed = true;
              break;
            }
          }
        }
        return ids;
      });
      // Restore only points removed from this actual contour segment. Searching every contour
      // point near every triangulation edge can pull unrelated points onto an internal diagonal,
      // producing overlapping cap fans after repeated cuts.
      const boundaryChains = new Map<string, number[]>();
      let loopBase = 0;
      [contour, ...holes].forEach((loop, loopIndex) => {
        const ids = simplified[loopIndex];
        for (let k = 0; k < ids.length; k++) {
          const a = ids[k],
            b = ids[(k + 1) % ids.length],
            chain = [a];
          let cursor = (a - loopBase + 1) % loop.length;
          while (cursor + loopBase !== b) {
            chain.push(cursor + loopBase);
            cursor = (cursor + 1) % loop.length;
          }
          boundaryChains.set(`${a}:${b}`, chain);
          boundaryChains.set(`${b}:${a}`, [b, ...chain.slice(1).reverse()]);
        }
        loopBase += loop.length;
      });
      const active = simplified.flat();
      const triangles = ShapeUtils.triangulateShape(
        simplified[0].map((j) => all[j].clone()),
        simplified.slice(1).map((loop) => loop.map((j) => all[j].clone())),
      ).map((face) => face.map((j) => active[j]));
      for (const face of triangles) {
        const ring: number[] = [];
        for (let k = 0; k < 3; k++) {
          const a = face[k],
            b = face[(k + 1) % 3];
          ring.push(...(boundaryChains.get(`${a}:${b}`) ?? [a]));
        }
        const center = new Vector3().add(world[face[0]]).add(world[face[1]]).add(world[face[2]]).divideScalar(3);
        for (let k = 0; k < ring.length; k++) {
          const a = world[ring[k]],
            b = world[ring[(k + 1) % ring.length]];
          const cross = a.clone().sub(center).cross(b.clone().sub(center));
          if (cross.length() <= epsilon * epsilon) continue;
          capArea += cross.length() * 0.5 * scale * scale;
          const positive = cross.dot(normal) > 0 ? [center, b, a] : [center, a, b];
          for (let half = 0; half < 2; half++) {
            const ordered = half === 0 ? positive : [...positive].reverse();
            emit(
              halves[half],
              ordered.map((p) => ({
                p,
                n: normal.clone().multiplyScalar(half === 0 ? -1 : 1),
                uv: new Vector2(p.dot(u) * scale, p.dot(v) * scale),
              })),
              capMaterialIndex,
            );
          }
        }
      }
    });
  const capCoords = halves.flatMap((faces) =>
    faces.filter((f) => f.material === capMaterialIndex).flatMap((f) => f.v.map((c) => c.uv)),
  );
  const cosine = Math.cos(uvRotation),
    sine = Math.sin(uvRotation);
  let minU = Infinity,
    minV = Infinity,
    maxU = -Infinity,
    maxV = -Infinity;
  for (const uv of capCoords) {
    const x = uv.x,
      y = uv.y;
    uv.set(x * cosine - y * sine, x * sine + y * cosine);
    minU = Math.min(minU, uv.x);
    minV = Math.min(minV, uv.y);
    maxU = Math.max(maxU, uv.x);
    maxV = Math.max(maxV, uv.y);
  }
  for (const uv of capCoords) {
    uv.set(
      uvMode === "fit" ? (uv.x - minU) / (maxU - minU || 1) : uv.x / uvUnits,
      uvMode === "fit" ? (uv.y - minV) / (maxV - minV || 1) : uv.y / uvUnits,
    ).add(uvOffset);
    if (![uv.x, uv.y].every((v) => Number.isFinite(Math.fround(v))))
      throw new RangeError("sliceGeometry: cap UVs exceed Float32 range.");
  }
  const build = (faces: Face[]) => {
    const geometry = new BufferGeometry(),
      p: number[] = [],
      n: number[] = [],
      tex: number[] = [];
    const materials = [...new Set(faces.map((f) => f.material))].sort((a, b) => a - b);
    for (const material of materials) {
      const start = p.length / 3;
      for (const face of faces)
        if (face.material === material)
          for (const corner of face.v) {
            const point = corner.p.clone().multiplyScalar(scale).add(origin);
            p.push(...point.toArray());
            n.push(...corner.n.toArray());
            tex.push(...corner.uv.toArray());
          }
      geometry.addGroup(start, p.length / 3 - start, material);
    }
    if (n.some((value) => !Number.isFinite(value)) || tex.some((value) => !Number.isFinite(value)))
      throw new RangeError("sliceGeometry: nonfinite interpolated attribute.");
    for (let i = 0; i < n.length; i += 3)
      if (Math.hypot(n[i], n[i + 1], n[i + 2]) < 0.5) throw new RangeError("sliceGeometry: interpolated normal is undefined.");
    geometry.setAttribute("position", new Float32BufferAttribute(p, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(n, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(tex, 2));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  };
  const positive = build(halves[0]);
  let negative: BufferGeometry | undefined;
  try {
    negative = build(halves[1]);
    for (const [geometry, sign] of [
      [positive, 1],
      [negative, -1],
    ] as const) {
      const p = geometry.getAttribute("position"),
        rendered: Vector3[][] = [];
      for (let i = 0; i < p.count; i += 3) {
        const tri = [0, 1, 2].map((k) =>
          new Vector3()
            .fromBufferAttribute(p, i + k)
            .sub(origin)
            .divideScalar(scale),
        );
        const n = tri[1].clone().sub(tri[0]).cross(tri[2].clone().sub(tri[0]));
        if (!tri.every((v) => v.toArray().every(Number.isFinite)) || n.length() <= epsilon * epsilon)
          throw new RangeError("sliceGeometry: Float32 output collapsed; rescale or recenter the source.");
        const group = geometry.groups.find((g) => i >= g.start && i < g.start + g.count);
        if (group?.materialIndex === capMaterialIndex && n.dot(normal) * sign >= 0)
          throw new RangeError("sliceGeometry: inverted cap triangle.");
        rendered.push(tri);
      }
      validateEdges(rendered, key, cap ? null : plane, epsilon * 4);
    }
  } catch (error) {
    positive.dispose();
    negative?.dispose();
    throw error;
  }
  return {
    positive,
    negative,
    diagnostics: { discardedDegenerateTriangles, selfIntersectionsChecked: false },
    loops: loops.map((loop) => loop.map((p) => p.clone().multiplyScalar(scale).add(origin))),
    holes: contours.filter((_, i) => depth(i) % 2 === 1).length,
    capArea,
    capMaterialIndex,
  };
}
