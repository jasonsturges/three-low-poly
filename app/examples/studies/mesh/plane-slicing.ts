import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  FrontSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Plane,
  ShapeUtils,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { thickenSurface, triangulateRegion } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Plane Slicing",
  description:
    "STUDY — split a closed triangle mesh with a movable plane. Blue is the positive half, terracotta " +
    "the negative half, and gold marks new caps. Every mesh material is single-sided. Separation moves " +
    "the finished halves for inspection; it does not change the cut. Try Perforated panel with the " +
    "default Z plane: the cap must retain the hole. Torus and Two boxes exercise multiple contours. " +
    "The plane is drawn as a grid; its arrow points toward the positive half. Normals and UVs are " +
    "interpolated on clipped edges, source material groups survive, and caps receive planar UVs. " +
    "Coplanar source faces belong to the half behind their outward normal. Tangent cuts add no cap. " +
    "Contour nesting distinguishes holes from separate islands. Ambiguous contours are reported, not " +
    "filled speculatively. This study assumes closed, consistently wound, non-self-intersecting inputs; " +
    "it is not a general boolean or mesh-repair tool. Features below the scale-relative weld tolerance " +
    "can collapse. Volume and edge checks are measurements, not a global validity certificate.",
};

type Corner = { p: Vector3; n: Vector3; uv: Vector2 };
type Face = { v: Corner[]; material: number };
export type SlicePreset = "Box" | "Sphere" | "Torus" | "Perforated panel" | "Two boxes";

export function slicingSource(preset: SlicePreset): BufferGeometry {
  if (preset === "Box") return new BoxGeometry(2.4, 1.8, 1.4);
  if (preset === "Sphere") return new SphereGeometry(1.3, 24, 12);
  if (preset === "Torus") return new TorusGeometry(1, 0.38, 12, 32);
  if (preset === "Two boxes") {
    const a = new BoxGeometry(1, 1.4, 1).translate(-0.9, 0, 0);
    const b = new BoxGeometry(1, 1.4, 1).translate(0.9, 0, 0);
    const result = mergeGeometries([a, b])!;
    a.dispose();
    b.dispose();
    return result;
  }
  const outline = [new Vector2(-1.5, -1), new Vector2(1.5, -1), new Vector2(1.5, 1), new Vector2(-1.5, 1)];
  const hole = Array.from(
    { length: 32 },
    (_, i) => new Vector2(Math.cos((i * Math.PI) / 16) * 0.55, Math.sin((i * Math.PI) / 16) * 0.55),
  );
  const region = triangulateRegion(outline, [hole]);
  return thickenSurface(
    {
      points: region.points.map((p) => new Vector3(p.x, p.y, 0)),
      triangles: region.triangles,
      uv: region.points.map((p) => new Vector2((p.x + 1.5) / 3, (p.y + 1) / 2)),
    },
    { thickness: 0.7 },
  ).geometry;
}

/** Local experiment: normalized coordinates and canonical plane vertices join shading/UV seams. */
export function sliceStudyGeometry(source: BufferGeometry, cuttingPlane: Plane, cap = true) {
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
  source.computeBoundingBox();
  const origin = source.boundingBox!.getCenter(new Vector3()),
    scale = source.boundingBox!.getSize(new Vector3()).length();
  if (!(scale > 0) || !Number.isFinite(scale)) throw new Error("Invalid geometry extent.");
  const normal = cuttingPlane.normal.clone().normalize();
  const plane = new Plane(normal, (cuttingPlane.constant / cuttingPlane.normal.length() + normal.dot(origin)) / scale);
  const epsilon = 1e-7;
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
        n: normals ? new Vector3().fromBufferAttribute(normals, i) : new Vector3(),
        uv: uv ? new Vector2(uv.getX(i), uv.getY(i)) : new Vector2(),
      };
    });
    if (area(vertices) <= epsilon * epsilon) continue; // Sphere primitives contain collapsed polar triangles.
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
  const edges = boundary(halves[0]);
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
      const active = simplified.flat();
      const triangles = ShapeUtils.triangulateShape(
        simplified[0].map((j) => all[j].clone()),
        simplified.slice(1).map((loop) => loop.map((j) => all[j].clone())),
      ).map((face) => face.map((j) => active[j]));
      for (const face of triangles) {
        const ring: number[] = [];
        for (let k = 0; k < 3; k++) {
          const a = face[k],
            b = face[(k + 1) % 3],
            delta = all[b].clone().sub(all[a]),
            length = delta.lengthSq();
          const split = all
            .map((p, j) => ({ j, t: p.clone().sub(all[a]).dot(delta) / length }))
            .filter(
              ({ j, t }) => t >= 0 && t < 1 && Math.abs(all[j].clone().sub(all[a]).cross(delta)) <= epsilon * Math.sqrt(length),
            );
          split.sort((a, b) => a.t - b.t);
          ring.push(...split.map((s) => s.j));
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
    geometry.setAttribute("position", new Float32BufferAttribute(p, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(n, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(tex, 2));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  };
  return {
    positive: build(halves[0]),
    negative: build(halves[1]),
    loops: loops.map((loop) => loop.map((p) => p.clone().multiplyScalar(scale).add(origin))),
    holes: contours.filter((_, i) => depth(i) % 2 === 1).length,
    capArea,
    capMaterialIndex,
  };
}

export function slicingVolume(geometry: BufferGeometry): number {
  const position = geometry.getAttribute("position"),
    index = geometry.index;
  let volume = 0;
  if (!position.count) return 0;
  const origin = new Vector3().fromBufferAttribute(position, 0);
  for (let i = 0; i < (index?.count ?? position.count); i += 3) {
    const p = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(position, index ? index.getX(i + k) : i + k).sub(origin));
    volume += p[0].dot(p[1].clone().cross(p[2])) / 6;
  }
  return volume;
}

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [3, 2, 5] });
  const key = new DirectionalLight(0xffeee0, 2);
  key.position.set(3, 4, 5);
  const fill = new DirectionalLight(0xb4ccff, 1.5);
  fill.position.set(-3, -2, -4);
  handle.scene.add(key, fill);
  const stage = new Group();
  handle.scene.add(stage);
  const blue = new MeshStandardMaterial({ color: 0x73adc9, roughness: 0.65, side: FrontSide });
  const red = new MeshStandardMaterial({ color: 0xc77559, roughness: 0.65, side: FrontSide });
  const gold = new MeshStandardMaterial({ color: 0xe8b45b, roughness: 0.6, side: FrontSide });
  const wire = new LineBasicMaterial({ color: 0x172632, transparent: true, opacity: 0.5 });
  const outline = new LineBasicMaterial({ color: 0xffda82 });
  const gridMat = new LineBasicMaterial({ color: 0x9bb4c5, transparent: true, opacity: 0.25 });
  const normalMat = new LineBasicMaterial({ color: 0xa7efb0 });
  const params = {
    source: "Perforated panel" as SlicePreset,
    yaw: 0,
    tilt: 0,
    distance: 0,
    separation: 0.85,
    view: "Both",
    caps: true,
    plane: true,
    contours: true,
    wireframe: false,
    normals: false,
    contoursReadout: "",
    volume: "",
    area: "",
    status: "",
  };
  const clear = () => {
    stage.traverse((o) => {
      if (o instanceof Mesh || o instanceof LineSegments) o.geometry.dispose();
    });
    stage.clear();
  };
  const rebuild = () => {
    clear();
    const source = slicingSource(params.source);
    const n = new Vector3(
      Math.sin(params.yaw) * Math.cos(params.tilt),
      Math.sin(params.tilt),
      Math.cos(params.yaw) * Math.cos(params.tilt),
    );
    const plane = new Plane(n, -params.distance);
    try {
      const result = sliceStudyGeometry(source, plane, params.caps);
      const total = slicingVolume(source),
        remaining = slicingVolume(result.positive) + slicingVolume(result.negative);
      params.volume = params.caps
        ? `${((Math.abs(remaining - total) / total) * 100).toFixed(5)}% difference`
        : "Caps off: open surfaces";
      params.contoursReadout = `${result.loops.length} loops · ${result.holes} holes`;
      params.area = params.caps ? result.capArea.toFixed(5) : "Caps off";
      params.status = "Built · intersections not checked";
      for (const [half, geometry, material, sign] of [
        ["Positive", result.positive, blue, 1],
        ["Negative", result.negative, red, -1],
      ] as const) {
        if (params.view !== "Both" && params.view !== half) {
          geometry.dispose();
          continue;
        }
        const part = new Group();
        part.position.copy(n).multiplyScalar((sign * params.separation) / 2);
        stage.add(part);
        const materials = Array.from({ length: result.capMaterialIndex + 1 }, (_, i) =>
          i === result.capMaterialIndex ? gold : material,
        );
        part.add(new Mesh(geometry, materials));
        if (params.wireframe) part.add(new LineSegments(new WireframeGeometry(geometry), wire));
        if (params.contours) {
          const points = result.loops.flatMap((loop) => loop.flatMap((p, i) => [p, loop[(i + 1) % loop.length]]));
          part.add(new LineSegments(new BufferGeometry().setFromPoints(points), outline));
        }
        if (params.normals) {
          const p = geometry.getAttribute("position"),
            lines: Vector3[] = [];
          for (let i = 0; i < p.count; i += Math.max(1, Math.ceil(p.count / 3 / 90)) * 3) {
            const a = new Vector3().fromBufferAttribute(p, i),
              b = new Vector3().fromBufferAttribute(p, i + 1),
              c = new Vector3().fromBufferAttribute(p, i + 2);
            const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize(),
              center = a.clone().add(b).add(c).divideScalar(3);
            lines.push(center, center.clone().addScaledVector(normal, 0.13));
          }
          part.add(new LineSegments(new BufferGeometry().setFromPoints(lines), normalMat));
        }
      }
    } catch (error) {
      params.status = error instanceof Error ? error.message : String(error);
      params.contoursReadout = "Unresolved";
      params.volume = "—";
      params.area = "—";
      stage.add(new LineSegments(new WireframeGeometry(source), wire));
    }
    source.dispose();
    if (params.plane) {
      const seed = Math.abs(n.x) < 0.8 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0),
        u = seed.addScaledVector(n, -seed.dot(n)).normalize(),
        v = n.clone().cross(u),
        center = n.clone().multiplyScalar(params.distance);
      const point = (a: number, b: number) => center.clone().addScaledVector(u, a).addScaledVector(v, b),
        lines: Vector3[] = [];
      for (let i = -4; i <= 4; i++) {
        lines.push(point(i * 0.5, -2), point(i * 0.5, 2), point(-2, i * 0.5), point(2, i * 0.5));
      }
      lines.push(
        center,
        center.clone().addScaledVector(n, 0.65),
        center.clone().addScaledVector(n, 0.65),
        center.clone().addScaledVector(n, 0.48).addScaledVector(u, 0.07),
        center.clone().addScaledVector(n, 0.65),
        center.clone().addScaledVector(n, 0.48).addScaledVector(u, -0.07),
      );
      stage.add(new LineSegments(new BufferGeometry().setFromPoints(lines), gridMat));
    }
  };
  rebuild();
  frameObject(handle, stage, { fit: 1.05 });
  const gui = new GUI({ width: 330 });
  gui.title("Plane Slicing");
  gui.add(params, "source", ["Box", "Sphere", "Torus", "Perforated panel", "Two boxes"]).name("Source").onChange(rebuild);
  const cut = gui.addFolder("Cutting plane");
  cut.add(params, "yaw", -Math.PI, Math.PI, 0.01).name("Yaw").onChange(rebuild);
  cut
    .add(params, "tilt", -Math.PI / 2, Math.PI / 2, 0.01)
    .name("Tilt")
    .onChange(rebuild);
  cut.add(params, "distance", -2, 2, 0.01).name("Distance").onChange(rebuild);
  cut
    .add(
      {
        reset: () => {
          params.yaw = 0;
          params.tilt = 0;
          params.distance = 0;
          gui.controllersRecursive().forEach((c) => c.updateDisplay());
          rebuild();
        },
      },
      "reset",
    )
    .name("Reset plane");
  const inspect = gui.addFolder("Inspect — single sided");
  inspect.add(params, "view", ["Both", "Positive", "Negative"]).name("Half").onChange(rebuild);
  inspect.add(params, "separation", 0, 2, 0.01).name("Separation").onChange(rebuild);
  for (const [property, label] of [
    ["caps", "Caps"],
    ["plane", "Plane grid"],
    ["contours", "Cut outlines"],
    ["wireframe", "Wireframe"],
    ["normals", "Face normals"],
  ] as const)
    inspect.add(params, property).name(label).onChange(rebuild);
  inspect.add({ frame: () => frameObject(handle, stage, { fit: 1.05 }) }, "frame").name("Frame study");
  const readout = gui.addFolder("Measurements");
  readout.add(params, "contoursReadout").name("Contours").listen().disable();
  readout.add(params, "area").name("Cap area / half").listen().disable();
  readout.add(params, "volume").name("Volume sum").listen().disable();
  readout.add(params, "status").name("Status").listen().disable();
  return () => {
    gui.destroy();
    clear();
    [blue, red, gold, wire, outline, gridMat, normalMat].forEach((m) => m.dispose());
    handle.dispose();
  };
}
