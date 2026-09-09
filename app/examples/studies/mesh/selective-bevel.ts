import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  FrontSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Plane,
  Vector3,
  WireframeGeometry,
} from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { inspectGeometry, sliceGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Selective Bevel",
  description:
    "STUDY — select an edge, an adjacent pair, or a corner on a convex mesh. A plane clips each selected edge to create a one-segment chamfer. Width is setback measured along each adjacent face. Blue surfaces are retained source faces; gold surfaces are new chamfers. Adjacent cuts meet through plane intersections; they do not produce the spherical corners of Convex Bevel. Selection refers to the original source edges, with coplanar triangle diagonals excluded. Closed-mesh inspection runs on the result. This is a convex planar experiment, not selective rounded beveling or concave mesh editing. Original tools remain unchanged.",
};
export type SelectiveShape = "Box" | "Wedge";
export type EdgeSelection = "Single edge" | "Adjacent pair" | "Corner" | "All edges";
export function selectiveSource(shape: SelectiveShape): BufferGeometry {
  const source =
    shape === "Box"
      ? new BoxGeometry(2.6, 1.8, 1.6)
      : new ConvexGeometry([
          new Vector3(-1.3, -0.8, -0.8),
          new Vector3(1.3, -0.8, -0.8),
          new Vector3(-0.7, 0.9, -0.8),
          new Vector3(-1.3, -0.8, 0.8),
          new Vector3(1.3, -0.8, 0.8),
          new Vector3(-0.7, 0.9, 0.8),
        ]);
  source.clearGroups();
  source.addGroup(0, source.index?.count ?? source.getAttribute("position").count, 0);
  return source;
}
export function selectiveEdges(source: BufferGeometry) {
  const r = inspectGeometry(source);
  if (r.components.length !== 1 || !r.components[0].closed || !(r.components[0].signedVolume! > 0))
    throw new Error("Expected one outward closed solid.");
  const map = new Map<string, { a: number; b: number; normals: Vector3[] }>();
  for (const tri of r.triangles) {
    const [a, b, c] = tri.map((i) => r.points[i]),
      n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if (r.points.some((p) => p.clone().sub(a).dot(n) > r.tolerance * 4)) throw new Error("This study requires a convex source.");
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
    edges: [...map.values()].filter((e) => e.normals.length === 2 && e.normals[0].dot(e.normals[1]) < 1 - 1e-6),
  };
}
export function selectiveBevelStudy(source: BufferGeometry, width: number, selection: EdgeSelection, edgeIndex: number) {
  if (!Number.isFinite(width) || width < 0) throw new Error("Width must be nonnegative.");
  const topology = selectiveEdges(source),
    { edges, points } = topology;
  if (!Number.isInteger(edgeIndex) || !edges[edgeIndex]) throw new Error("Invalid edge ID.");
  const picked = edges[edgeIndex],
    incident = edges
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.a === picked.a || e.b === picked.a)
      .map(({ i }) => i);
  const selected =
    selection === "All edges"
      ? edges.map((_, i) => i)
      : selection === "Corner"
        ? incident
        : selection === "Adjacent pair"
          ? [edgeIndex, incident.find((i) => i !== edgeIndex)!]
          : [edgeIndex];
  let geometry = source.clone();
  try {
    if (width > 0)
      for (const id of selected) {
        const e = edges[id],
          dot = e.normals[0].dot(e.normals[1]),
          normal = e.normals[0].clone().add(e.normals[1]).normalize();
        const setback = width * Math.sqrt((1 - dot) / 2);
        const cut = sliceGeometry(geometry, new Plane(normal, -normal.dot(points[e.a]) + setback));
        cut.positive.dispose();
        geometry.dispose();
        geometry = cut.negative;
        if (!geometry.getAttribute("position").count) throw new Error("Width consumes the solid; reduce it.");
      }
    // Retained face groups stay blue; every new clipping cap uses the shared chamfer material.
    geometry.groups.forEach((g) => {
      if (g.materialIndex !== 0) g.materialIndex = 1;
    });
    const report = inspectGeometry(geometry);
    if (report.components.length !== 1 || !report.components[0].closed || !(report.components[0].signedVolume! > 0))
      throw new Error("Result failed closed-solid inspection.");
    return { geometry, report, selected, ...topology };
  } catch (error) {
    geometry.dispose();
    throw error;
  }
}
export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [3, 2.5, 4] });
  const key = new DirectionalLight(0xffeee0, 2);
  key.position.set(3, 5, 4);
  const fill = new DirectionalLight(0xb4ccff, 1.5);
  fill.position.set(-3, -2, -4);
  handle.scene.add(key, fill);
  const stage = new Group();
  handle.scene.add(stage);
  const materials = [0x79adc4, 0xd6b473].map((color) => new MeshStandardMaterial({ color, roughness: 0.6, side: FrontSide }));
  const selectedMaterial = new LineBasicMaterial({ color: 0xff8b54, depthTest: false, transparent: true, opacity: 1 });
  const originalMaterial = new LineBasicMaterial({ color: 0xb9c6d4, transparent: true, opacity: 0.35 }),
    wire = new LineBasicMaterial({ color: 0x1e3644, transparent: true, opacity: 0.4 });
  const params = {
    shape: "Box" as SelectiveShape,
    selection: "Single edge" as EdgeSelection,
    edge: 0,
    width: 0.2,
    original: true,
    selected: true,
    wireframe: false,
  };
  const gui = new GUI({ width: 340 });
  gui.title("Selective Bevel — chamfers");
  const summary = document.createElement("div");
  summary.style.cssText = "padding:12px;line-height:1.6;white-space:pre-line;font-size:12px";
  summary.setAttribute("role", "status");
  summary.setAttribute("aria-label", "Chamfer measurements");
  const layout = () => {
    const w = container.clientWidth,
      h = container.clientHeight,
      p = Math.min(340, w * 0.45);
    gui.domElement.style.width = `${p}px`;
    if (w && h) handle.camera.setViewOffset(w, h, p / 2, 0, w, h);
  };
  const resize = new ResizeObserver(layout);
  resize.observe(container);
  layout();
  const frame = () =>
    frameObject(handle, stage, {
      fit: Math.max(
        1.2,
        (1.2 * container.clientHeight) / Math.max(1, container.clientWidth - Math.min(340, container.clientWidth * 0.45)),
      ),
    });
  const clear = () => {
    stage.traverse((o) => {
      if (o instanceof Mesh || o instanceof LineSegments) o.geometry.dispose();
    });
    stage.clear();
  };
  const rebuild = () => {
    clear();
    const source = selectiveSource(params.shape);
    try {
      const result = selectiveBevelStudy(source, params.width, params.selection, params.edge);
      stage.add(new Mesh(result.geometry, materials));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(result.geometry), wire));
      const lines = (ids: number[], material: LineBasicMaterial) =>
        stage.add(
          new LineSegments(
            new BufferGeometry().setFromPoints(
              ids.flatMap((i) => [result.points[result.edges[i].a], result.points[result.edges[i].b]]),
            ),
            material,
          ),
        );
      if (params.original)
        lines(
          result.edges.map((_, i) => i),
          originalMaterial,
        );
      if (params.selected) lines(result.selected, selectedMaterial);
      summary.textContent = `${result.edges.length} original geometric edges\nSelected IDs: ${result.selected.join(", ")}\n${result.report.triangles.length} triangles · closed, consistent shell\nVolume: ${result.report.components[0].signedVolume!.toFixed(3)} units³\n\nBlue: retained faces · Gold: chamfers\nOrange: selected original edges\n\nOne-segment planar cuts only.\nWidth is face setback, not rolling radius.\nLarge widths can remove additional features.\nIntersections are not independently checked.`;
    } catch (error) {
      summary.textContent = (error as Error).message;
      stage.add(new LineSegments(new WireframeGeometry(source), originalMaterial));
    }
    source.dispose();
  };
  gui
    .add(params, "shape", ["Box", "Wedge"])
    .name("Source mesh")
    .onChange(() => {
      params.edge = 0;
      const s = selectiveSource(params.shape);
      edgeControl.max(selectiveEdges(s).edges.length - 1);
      s.dispose();
      edgeControl.updateDisplay();
      rebuild();
      frame();
    });
  gui.add(params, "selection", ["Single edge", "Adjacent pair", "Corner", "All edges"]).name("Selection").onChange(rebuild);
  const edgeControl = gui.add(params, "edge", 0, 11, 1).name("Original edge ID").onChange(rebuild);
  gui.add(params, "width", 0, 0.4, 0.01).name("Chamfer width").onChange(rebuild);
  const view = gui.addFolder("Inspect — single sided");
  view.add(params, "original").name("Original edges").onChange(rebuild);
  view.add(params, "selected").name("Selected edges").onChange(rebuild);
  view.add(params, "wireframe").name("Wireframe").onChange(rebuild);
  view.add({ frame }, "frame").name("Frame study");
  gui.domElement.appendChild(summary);
  rebuild();
  frame();
  return () => {
    resize.disconnect();
    gui.destroy();
    clear();
    [...materials, selectedMaterial, originalMaterial, wire].forEach((m) => m.dispose());
    handle.dispose();
  };
}
