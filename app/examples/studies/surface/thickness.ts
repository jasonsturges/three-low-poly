import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  FrontSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { triangulateRegion } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Surface Thickness",
  description:
    "STUDY — give an oriented sheet a front, a back, and walls around every boundary, including holes. " +
    "Blue is the front, terracotta the back, and gold the rim; all three use single-sided materials. " +
    "Orbit underneath, or isolate a part, to inspect winding. Source Overlay marks the original sheet. " +
    "Placement keeps the source at the front, center, or back of the thickness. " +
    "Compare normal offsets with fixed Z extrusion and a crease-compensated offset on the Fold preset. " +
    "Normal offsets move shared vertices by the requested distance but lose face-normal thickness at a crease. " +
    "Crease compensation fits the adjacent face-plane distances along the shared normal: exact on this fold, " +
    "approximate on general curved meshes. Face Error measures that local discrepancy. " +
    "This experiment consumes explicit indexed sheet topology, not arbitrary render buffers. It checks local face inversions, closure, " +
    "winding, and signed volume; these checks do not detect self-intersections. Tight folds, small holes, and " +
    "large thickness can still overlap. No general offset-surface or collision solver is implied.",
};

type Triangle = [number, number, number];
export type ThicknessPreset = "Panel" | "Panel with hole" | "Barrel" | "Saddle" | "Fold";
export type OffsetMethod = "Normal" | "Crease compensated" | "Fixed Z";
export interface StudySheet {
  points: Vector3[];
  triangles: Triangle[];
  uv: Vector2[];
}

/** Explicit topology stays separate from the duplicated render vertices used for flat shading. */
export function thicknessSheet(preset: ThicknessPreset, segments: number, bend: number): StudySheet {
  if (preset === "Panel with hole") {
    const outline = [new Vector2(-1.5, -1), new Vector2(1.5, -1), new Vector2(1.5, 1), new Vector2(-1.5, 1)];
    const hole = Array.from({ length: segments * 2 }, (_, i) => {
      const a = (i * Math.PI) / segments;
      return new Vector2(Math.cos(a) * 0.5, Math.sin(a) * 0.5);
    });
    const region = triangulateRegion(outline, [hole]);
    return {
      points: region.points.map((p) => new Vector3(p.x, p.y, 0)),
      uv: region.points.map((p) => new Vector2((p.x + 1.5) / 3, (p.y + 1) / 2)),
      triangles: region.triangles,
    };
  }
  // Even columns land exactly on the fold, independently of sampling density.
  const columns = segments * 2,
    rows = segments;
  const points: Vector3[] = [],
    uv: Vector2[] = [],
    triangles: Triangle[] = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= columns; i++) {
      const u = i / columns,
        v = j / rows,
        x = (u - 0.5) * 3,
        y = (v - 0.5) * 2;
      let p = new Vector3(x, y, 0);
      if (preset === "Barrel") {
        const angle = (x * bend) / 1.5;
        p = bend < 1e-8 ? p : new Vector3((Math.sin(angle) * 1.5) / bend, y, ((Math.cos(angle) - 1) * 1.5) / bend);
      } else if (preset === "Saddle") p.z = bend * ((x * x) / 2.25 - y * y) * 0.4;
      else if (preset === "Fold") p = new Vector3(x * Math.cos(bend), y, -Math.abs(x) * Math.sin(bend));
      points.push(p);
      uv.push(new Vector2(u, v));
    }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i,
        b = a + 1,
        d = a + columns + 1,
        c = d + 1;
      triangles.push([a, b, c], [a, c, d]);
    }
  return { points, uv, triangles };
}

function triangleNormal(points: Vector3[], [a, b, c]: Triangle): Vector3 {
  return points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a]));
}

/** Edge incidence uses source IDs, never a position weld that might join unrelated touching sheets. */
function sheetEdges(triangles: Triangle[]) {
  const edges = new Map<string, { a: number; b: number; count: number; balance: number }>();
  for (const face of triangles)
    for (let i = 0; i < 3; i++) {
      const a = face[i],
        b = face[(i + 1) % 3],
        key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      const edge = edges.get(key) ?? { a, b, count: 0, balance: 0 };
      edge.count++;
      edge.balance += a < b ? 1 : -1;
      edges.set(key, edge);
    }
  return [...edges.values()];
}

/** Study-local shell construction. No self-intersection repair or arbitrary mesh import. */
export function thickenStudySheet(sheet: StudySheet, thickness: number, placement: number, method: OffsetMethod) {
  if (!(thickness > 0) || !Number.isFinite(thickness) || Math.abs(placement) > 1 || !Number.isFinite(placement)) {
    throw new RangeError("Thickness must be positive; placement must be between -1 and 1.");
  }
  const { points, triangles } = sheet;
  const edges = sheetEdges(triangles);
  if (edges.some((e) => e.count > 2 || (e.count === 2 && e.balance !== 0))) {
    throw new Error("Expected a consistently oriented manifold sheet.");
  }
  const incident = points.map(() => [] as { normal: Vector3; weight: number }[]);
  for (const face of triangles) {
    const normal = triangleNormal(points, face);
    if (normal.lengthSq() < 1e-20) throw new Error("Degenerate source triangle.");
    normal.normalize();
    for (let k = 0; k < 3; k++) {
      const center = points[face[k]];
      const a = points[face[(k + 1) % 3]].clone().sub(center).normalize();
      const b = points[face[(k + 2) % 3]].clone().sub(center).normalize();
      const weight = Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
      incident[face[k]].push({ normal, weight });
    }
  }
  const offsets = incident.map((faces) => {
    if (method === "Fixed Z") return new Vector3(0, 0, 1);
    const direction = new Vector3();
    for (const { normal, weight } of faces) direction.addScaledVector(normal, weight);
    if (direction.lengthSq() < 1e-20) throw new Error("Undefined offset direction.");
    direction.normalize();
    if (method === "Crease compensated") {
      // One-dimensional weighted least-squares fit: minimize Σ w (s n·d − 1)².
      let numerator = 0,
        denominator = 0;
      for (const { normal, weight } of faces) {
        const dot = normal.dot(direction);
        numerator += weight * dot;
        denominator += weight * dot * dot;
      }
      if (denominator < 1e-12) throw new Error("Offset is singular at this crease.");
      direction.multiplyScalar(numerator / denominator);
    }
    return direction;
  });
  const front = points.map((p, i) => p.clone().addScaledVector(offsets[i], (thickness * (placement + 1)) / 2));
  const back = points.map((p, i) => p.clone().addScaledVector(offsets[i], (thickness * (placement - 1)) / 2));
  const count = points.length,
    vertices = [...front, ...back];
  const frontFaces = triangles.map((t) => [...t] as Triangle);
  const backFaces = triangles.map(([a, b, c]) => [c + count, b + count, a + count] as Triangle);
  const rimFaces: Triangle[] = [];
  for (const { a, b, count: uses } of edges)
    if (uses === 1) {
      // Reverse the front boundary edge; reverse again where the rim meets the back.
      rimFaces.push([b, a, a + count], [b, a + count, b + count]);
    }
  let faceError = 0;
  for (const face of triangles) {
    const normal = triangleNormal(points, face).normalize();
    for (const i of face) faceError = Math.max(faceError, Math.abs(offsets[i].dot(normal) - 1) * thickness);
  }
  let inverted = 0;
  triangles.forEach((face, i) => {
    const sourceNormal = triangleNormal(points, face);
    if (triangleNormal(vertices, frontFaces[i]).dot(sourceNormal) <= 0) inverted++;
    if (triangleNormal(vertices, backFaces[i]).dot(sourceNormal) >= 0) inverted++;
  });
  return { vertices, frontFaces, backFaces, rimFaces, faceError, inverted };
}

/** Flat triangle normals are derived from winding, rather than supplied independently. */
function renderFaces(points: Vector3[], triangles: Triangle[], uv?: Vector2[]): BufferGeometry {
  const positions: number[] = [],
    uvs: number[] = [];
  for (const face of triangles)
    for (const i of face) {
      positions.push(...points[i].toArray());
      const t = uv?.[i];
      uvs.push(t?.x ?? 0, t?.y ?? 0);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

export function inspectThickness(vertices: Vector3[], faces: Triangle[]) {
  const edges = sheetEdges(faces);
  let volume = 0,
    degenerate = 0;
  for (const face of faces) {
    const normal = triangleNormal(vertices, face);
    if (normal.lengthSq() < 1e-20) degenerate++;
    volume += vertices[face[0]].dot(normal) / 6;
  }
  return {
    open: edges.filter((e) => e.count === 1).length,
    bad: edges.filter((e) => e.count > 2 || (e.count === 2 && e.balance !== 0)).length,
    degenerate,
    volume,
  };
}

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [3, 2, 5] });
  const key = new DirectionalLight(0xffeee0, 2);
  key.position.set(2, 4, 5);
  const fill = new DirectionalLight(0xb4ccff, 1.5);
  fill.position.set(-3, -2, -4);
  handle.scene.add(key, fill);
  const stage = new Group();
  handle.scene.add(stage);
  const frontMat = new MeshStandardMaterial({ color: 0x73adc9, roughness: 0.65, side: FrontSide });
  const backMat = new MeshStandardMaterial({ color: 0xc77559, roughness: 0.65, side: FrontSide });
  const rimMat = new MeshStandardMaterial({ color: 0xe8b45b, roughness: 0.6, side: FrontSide });
  const wireMat = new LineBasicMaterial({ color: 0x15232e, transparent: true, opacity: 0.4 });
  const sourceMat = new LineBasicMaterial({ color: 0xe4eaf2, transparent: true, opacity: 0.4, depthTest: false });
  const normalMat = new LineBasicMaterial({ color: 0x9eeeb6 });
  const params = {
    preset: "Panel with hole" as ThicknessPreset,
    thickness: 0.18,
    placement: 0,
    method: "Crease compensated" as OffsetMethod,
    segments: 10,
    bend: 0.8,
    view: "All",
    wireframe: false,
    source: false,
    normals: false,
    topology: "",
    validity: "",
    volume: "",
    error: "",
    built: "",
  };
  const clear = () => {
    for (const child of stage.children) if (child instanceof Mesh || child instanceof LineSegments) child.geometry.dispose();
    stage.clear();
  };
  const rebuild = () => {
    clear();
    const sheet = thicknessSheet(params.preset, params.segments, params.bend);
    const shell = thickenStudySheet(sheet, params.thickness, params.placement, params.method);
    const { vertices, frontFaces, backFaces, rimFaces } = shell;
    const faces = [...frontFaces, ...backFaces, ...rimFaces];
    const uv = [...sheet.uv, ...sheet.uv];
    const parts = [
      { name: "Front", faces: frontFaces, material: frontMat },
      { name: "Back", faces: backFaces, material: backMat },
      { name: "Rim", faces: rimFaces, material: rimMat },
    ];
    for (const part of parts) {
      if (params.view !== "All" && params.view !== part.name) continue;
      const geometry = renderFaces(vertices, part.faces, uv);
      stage.add(new Mesh(geometry, part.material));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wireMat));
      if (params.normals) {
        const lines: Vector3[] = [];
        const stride = Math.max(1, Math.ceil(part.faces.length / 80));
        for (let i = 0; i < part.faces.length; i += stride) {
          const face = part.faces[i];
          const center = vertices[face[0]].clone().add(vertices[face[1]]).add(vertices[face[2]]).divideScalar(3);
          lines.push(center, center.clone().addScaledVector(triangleNormal(vertices, face).normalize(), 0.12));
        }
        stage.add(new LineSegments(new BufferGeometry().setFromPoints(lines), normalMat));
      }
    }
    if (params.source) {
      const geometry = renderFaces(sheet.points, sheet.triangles);
      const overlay = new LineSegments(new WireframeGeometry(geometry), sourceMat);
      overlay.renderOrder = 2;
      stage.add(overlay);
      geometry.dispose();
    }
    const check = inspectThickness(vertices, faces);
    params.topology = `${check.open} open · ${check.bad} bad · ${check.degenerate} degenerate`;
    params.validity = shell.inverted ? `${shell.inverted} inverted faces — reduce thickness` : "No local face inversions";
    params.volume = check.volume.toFixed(5);
    params.error = `${((shell.faceError / params.thickness) * 100).toFixed(2)}% of thickness`;
    params.built = `${faces.length} triangles · ${rimFaces.length / 2} boundary edges`;
  };
  rebuild();
  frameObject(handle, stage, { fit: 1.15 });
  const gui = new GUI({ width: 320 });
  gui.title("Surface Thickness");
  const shape = gui.addFolder("Sheet");
  shape.add(params, "preset", ["Panel", "Panel with hole", "Barrel", "Saddle", "Fold"]).name("Surface").onChange(rebuild);
  shape.add(params, "segments", 2, 24, 1).name("Resolution").onChange(rebuild);
  shape.add(params, "bend", 0, 1.35, 0.01).name("Bend / fold").onChange(rebuild);
  const thickness = gui.addFolder("Thickness");
  thickness.add(params, "thickness", 0.01, 0.6, 0.01).name("Distance").onChange(rebuild);
  thickness
    .add(params, "placement", { "Source at front": -1, Centered: 0, "Source at back": 1 })
    .name("Placement")
    .onChange(rebuild);
  thickness.add(params, "method", ["Normal", "Crease compensated", "Fixed Z"]).name("Offset method").onChange(rebuild);
  const inspect = gui.addFolder("Inspect — single sided");
  inspect.add(params, "view", ["All", "Front", "Back", "Rim"]).name("Show part").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);
  inspect.add(params, "source").name("Source overlay").onChange(rebuild);
  inspect.add(params, "normals").name("Face normals").onChange(rebuild);
  inspect.add({ frame: () => frameObject(handle, stage, { fit: 1.15 }) }, "frame").name("Frame surface");
  const measurements = gui.addFolder("Complete shell measurements");
  measurements.add(params, "topology").name("Topology").listen().disable();
  measurements.add(params, "validity").name("Offset check").listen().disable();
  measurements.add(params, "volume").name("Signed volume").listen().disable();
  measurements.add(params, "error").name("Face error").listen().disable();
  measurements.add(params, "built").name("Geometry").listen().disable();
  return () => {
    gui.destroy();
    clear();
    for (const material of [frontMat, backMat, rimMat, wireMat, sourceMat, normalMat]) material.dispose();
    handle.dispose();
  };
}
