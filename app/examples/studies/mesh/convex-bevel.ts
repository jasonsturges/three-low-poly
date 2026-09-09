import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  EdgesGeometry,
  Float32BufferAttribute,
  FrontSide,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  TetrahedronGeometry,
  Vector3,
  WireframeGeometry,
} from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Convex Bevel",
  description:
    "STUDY — constant-radius bevels on closed convex meshes. All geometric edges are treated; " +
    "coplanar triangle diagonals are ignored. One segment creates a chamfer; more segments sample circular " +
    "edge bands and spherical corner patches. Blue faces, gold bands and coral corners reveal the joins. " +
    "Radius is the rolling-ball radius, not a uniform face setback: sharper edges consume more face area. " +
    "This experiment reconstructs a convex hull around an inset core. It does not preserve UVs or source " +
    "materials, and does not yet support concave shapes or selective edges. All materials are single-sided.",
};
export type BevelShape = "Box" | "Tapered block" | "Wedge" | "Tetrahedron" | "Octahedron" | "Icosahedron";
export function bevelStudySource(shape: BevelShape): BufferGeometry {
  if (shape === "Tetrahedron") return new TetrahedronGeometry(1.45);
  if (shape === "Octahedron") return new OctahedronGeometry(1.45);
  if (shape === "Icosahedron") return new IcosahedronGeometry(1.45);
  if (shape === "Wedge")
    return new ConvexGeometry([
      new Vector3(-1.3, -0.8, -0.8),
      new Vector3(1.3, -0.8, -0.8),
      new Vector3(-0.7, 0.9, -0.8),
      new Vector3(-1.3, -0.8, 0.8),
      new Vector3(1.3, -0.8, 0.8),
      new Vector3(-0.7, 0.9, 0.8),
    ]);
  const geometry = new BoxGeometry(2.6, 1.8, 1.6);
  if (shape === "Tapered block") {
    const p = geometry.getAttribute("position");
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * 0.65 + 0.25, p.getY(i), p.getZ(i) * 0.7);
    geometry.computeVertexNormals();
  }
  return geometry;
}
type Plane = { n: Vector3; d: number };
/** Study-local reconstruction: inset a convex solid, then sample its rounded offset. */
export function bevelConvexStudy(source: BufferGeometry, radius: number, segments: number) {
  if (!Number.isFinite(radius) || radius < 0 || !Number.isInteger(segments) || segments < 1 || segments > 12)
    throw new Error("Use a nonnegative radius and 1–12 segments.");
  const p = source.getAttribute("position"),
    index = source.index;
  if (!p || p.itemSize !== 3 || (index?.count ?? p.count) % 3) throw new Error("Expected triangle geometry.");
  const vertices = Array.from({ length: p.count }, (_, i) => new Vector3().fromBufferAttribute(p, i));
  if (!vertices.length || vertices.some((v) => !v.toArray().every(Number.isFinite))) throw new Error("Invalid source positions.");
  const scale = Math.max(...vertices.map((v) => v.length()));
  const tolerance = Math.max(scale * 1e-6, 1e-9);
  const key = (v: Vector3) =>
    v
      .toArray()
      .map((x) => Math.round(x / tolerance))
      .join(",");
  const planes: Plane[] = [],
    edges = new Map<string, number[]>();
  const count = index?.count ?? p.count;
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
  if (radius === 0) {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    geometry.clearGroups();
    geometry.addGroup(0, geometry.getAttribute("position").count, 0);
    geometry.computeVertexNormals();
    return { geometry, core, faces: planes.length, patches: [count / 3, 0, 0] };
  }
  const samples: Vector3[] = [],
    owners = new Map<string, number>();
  const add = (center: Vector3, normal: Vector3, owner: number) => {
    const v = center.clone().addScaledVector(normal.normalize(), radius);
    const id = key(v);
    if (!owners.has(id)) {
      samples.push(v);
      owners.set(id, owner);
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
  const hull = new ConvexGeometry(samples),
    hp = hull.getAttribute("position");
  const buffers: number[][] = [[], [], []];
  for (let i = 0; i < hp.count; i += 3) {
    const triangle = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(hp, i + k));
    // Classify by source-face support first, then by how many core corners contribute.
    const face = planes.some((f) => triangle.every((v) => Math.abs(f.n.dot(v) - f.d) < tolerance * 4));
    const ownersHere = new Set(triangle.map((v) => owners.get(key(v))));
    const category = face ? 0 : ownersHere.size > 1 ? 1 : 2;
    triangle.forEach((v) => buffers[category].push(...v.toArray()));
  }
  hull.dispose();
  const geometry = new BufferGeometry().setAttribute("position", new Float32BufferAttribute(buffers.flat(), 3));
  let start = 0;
  buffers.forEach((b, i) => {
    geometry.addGroup(start, b.length / 3, i);
    start += b.length / 3;
  });
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, core, faces: planes.length, patches: buffers.map((b) => b.length / 9) };
}

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [3, 2.5, 4] });
  const keyLight = new DirectionalLight(0xffeee0, 2);
  keyLight.position.set(3, 5, 4);
  const fill = new DirectionalLight(0xb4ccff, 1.5);
  fill.position.set(-3, -2, -4);
  handle.scene.add(keyLight, fill);
  const stage = new Group();
  handle.scene.add(stage);
  const materials = [0x79adc4, 0xd6b473, 0xd68e83].map(
    (color) => new MeshStandardMaterial({ color, roughness: 0.58, side: FrontSide }),
  );
  const wire = new LineBasicMaterial({ color: 0x233946, transparent: true, opacity: 0.45 });
  const ghost = new LineBasicMaterial({ color: 0xd4e2ef, transparent: true, opacity: 0.35 });
  const inner = new LineBasicMaterial({ color: 0x9de1b2, depthTest: false, transparent: true, opacity: 0.7 });
  const params = {
    shape: "Box" as BevelShape,
    radius: 0.22,
    segments: 3,
    colors: true,
    wireframe: false,
    original: false,
    core: false,
    normals: false,
    status: "",
    triangles: "",
    patches: "",
  };
  const clear = () => {
    stage.traverse((o) => {
      if (o instanceof Mesh || o instanceof LineSegments) o.geometry.dispose();
    });
    stage.clear();
  };
  const rebuild = () => {
    clear();
    const source = bevelStudySource(params.shape);
    try {
      const result = bevelConvexStudy(source, params.radius, params.segments);
      stage.add(new Mesh(result.geometry, params.colors ? materials : materials[0]));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(result.geometry), wire));
      if (params.original) stage.add(new LineSegments(new EdgesGeometry(source), ghost));
      if (params.core) {
        const hull = new ConvexGeometry(result.core);
        stage.add(new LineSegments(new EdgesGeometry(hull), inner));
        hull.dispose();
      }
      if (params.normals) {
        const p = result.geometry.getAttribute("position"),
          n = result.geometry.getAttribute("normal"),
          points: Vector3[] = [];
        for (let i = 0; i < p.count; i += 3) {
          const center = new Vector3()
            .fromBufferAttribute(p, i)
            .add(new Vector3().fromBufferAttribute(p, i + 1))
            .add(new Vector3().fromBufferAttribute(p, i + 2))
            .divideScalar(3);
          points.push(center, center.clone().addScaledVector(new Vector3().fromBufferAttribute(n, i), 0.1));
        }
        stage.add(new LineSegments(new BufferGeometry().setFromPoints(points), inner));
      }
      params.status = `${result.faces} planes · ${result.core.length} corners`;
      params.triangles = `${result.geometry.getAttribute("position").count / 3} triangles`;
      params.patches = result.patches.join(" / ");
    } catch (error) {
      params.status = (error as Error).message;
      params.triangles = "No bevel output";
      params.patches = "";
      stage.add(new LineSegments(new EdgesGeometry(source), ghost));
    }
    source.dispose();
  };
  rebuild();
  frameObject(handle, stage, { fit: 1.2 });
  const gui = new GUI({ width: 350 });
  gui.title("Convex Bevel — study");
  gui
    .add(params, "shape", ["Box", "Tapered block", "Wedge", "Tetrahedron", "Octahedron", "Icosahedron"])
    .name("Source mesh")
    .onChange(rebuild);
  const bevel = gui.addFolder("All convex edges");
  bevel.add(params, "radius", 0, 0.65, 0.01).name("Bevel radius").onChange(rebuild);
  bevel.add(params, "segments", 1, 8, 1).name("Segments").onChange(rebuild);
  const inspect = gui.addFolder("Inspect — single sided");
  for (const [prop, label] of [
    ["colors", "Face / band / corner"],
    ["wireframe", "Wireframe"],
    ["original", "Original edges"],
    ["core", "Inset core"],
    ["normals", "Face normals"],
  ] as const)
    inspect.add(params, prop).name(label).onChange(rebuild);
  inspect.add({ frame: () => frameObject(handle, stage, { fit: 1.2 }) }, "frame").name("Frame study");
  const info = gui.addFolder("Measurements");
  info.add(params, "status").name("Topology").listen().disable();
  info.add(params, "triangles").name("Geometry").listen().disable();
  info.add(params, "patches").name("Face / band / corner").listen().disable();
  return () => {
    gui.destroy();
    clear();
    [...materials, wire, ghost, inner].forEach((m) => m.dispose());
    handle.dispose();
  };
}
