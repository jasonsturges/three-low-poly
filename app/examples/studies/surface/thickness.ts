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
import { triangulateRegion, thickenSurface, surfaceFromGrid, type IndexedSurface } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Surface Thickness",
  description:
    "SDK-backed STUDY — give an oriented sheet a front, a back, and walls around every boundary, including holes. " +
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

export type ThicknessPreset = "Panel" | "Panel with hole" | "Barrel" | "Saddle" | "Fold";
export type OffsetMethod = "Normal" | "Crease compensated" | "Fixed Z";
export type StudySheet = IndexedSurface;

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
  // Even columns land exactly on the fold at every resolution.
  const columns = segments * 2,
    rows = segments;
  const grid = Array.from({ length: rows + 1 }, (_, j) =>
    Array.from({ length: columns + 1 }, (_, i) => {
      const x = (i / columns - 0.5) * 3,
        y = (j / rows - 0.5) * 2;
      if (preset === "Barrel" && bend > 1e-8) {
        const angle = (x * bend) / 1.5;
        return new Vector3((Math.sin(angle) * 1.5) / bend, y, ((Math.cos(angle) - 1) * 1.5) / bend);
      }
      if (preset === "Saddle") return new Vector3(x, y, bend * ((x * x) / 2.25 - y * y) * 0.4);
      if (preset === "Fold") return new Vector3(x * Math.cos(bend), y, -Math.abs(x) * Math.sin(bend));
      return new Vector3(x, y, 0);
    }),
  );
  return surfaceFromGrid(grid);
}

/** Flat triangle normals are derived from winding, rather than supplied independently. */
function renderFaces(
  points: readonly Vector3[],
  triangles: readonly (readonly [number, number, number])[],
  uv?: readonly Vector2[],
): BufferGeometry {
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
    const { geometry, diagnostics } = thickenSurface(sheet, {
      thickness: params.thickness,
      placement: params.placement === -1 ? "front" : params.placement === 1 ? "back" : "centered",
      offset: params.method === "Fixed Z" ? new Vector3(0, 0, 1) : params.method === "Normal" ? "normal" : "crease-compensated",
      onInvalid: "report",
    });
    const selected = ["Front", "Back", "Rim"].indexOf(params.view);
    const group = selected === -1 ? { start: 0, count: geometry.getAttribute("position").count } : geometry.groups[selected];
    geometry.setDrawRange(group.start, group.count);
    stage.add(new Mesh(geometry, [frontMat, backMat, rimMat]));
    const position = geometry.getAttribute("position"),
      normal = geometry.getAttribute("normal");
    if (params.wireframe) {
      const selectedGeometry = new BufferGeometry();
      selectedGeometry.setAttribute(
        "position",
        new Float32BufferAttribute(Array.from(position.array).slice(group.start * 3, (group.start + group.count) * 3), 3),
      );
      stage.add(new LineSegments(new WireframeGeometry(selectedGeometry), wireMat));
      selectedGeometry.dispose();
    }
    if (params.normals) {
      const lines: Vector3[] = [];
      const stride = Math.max(1, Math.ceil(group.count / 3 / 80)) * 3;
      for (let i = group.start; i < group.start + group.count; i += stride) {
        const center = new Vector3();
        for (let k = 0; k < 3; k++) center.add(new Vector3().fromBufferAttribute(position, i + k));
        center.divideScalar(3);
        lines.push(center, center.clone().addScaledVector(new Vector3().fromBufferAttribute(normal, i), 0.12));
      }
      stage.add(new LineSegments(new BufferGeometry().setFromPoints(lines), normalMat));
    }
    if (params.source) {
      const geometry = renderFaces(sheet.points, sheet.triangles);
      const overlay = new LineSegments(new WireframeGeometry(geometry), sourceMat);
      overlay.renderOrder = 2;
      stage.add(overlay);
      geometry.dispose();
    }
    params.topology = `${diagnostics.boundaryEdges} sealed edges · ${diagnostics.degenerateFaces} degenerate`;
    params.validity = diagnostics.invertedFaces
      ? `${diagnostics.invertedFaces} inverted faces — reduce thickness`
      : "No local face inversions";
    params.volume = diagnostics.signedVolume.toFixed(5);
    params.error = `${((diagnostics.maxFaceThicknessError / params.thickness) * 100).toFixed(2)}% of thickness`;
    params.built = `${position.count / 3} triangles · ${diagnostics.boundaryEdges} boundary edges`;
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
