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
  Vector3,
  WireframeGeometry,
} from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { convexEdges, chamferConvexGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Selective Bevel",
  description:
    "STUDY — select an edge, an adjacent pair, or a corner on a convex mesh. A plane clips each selected edge to create a one-segment chamfer. Width is setback measured along each adjacent face. Blue surfaces are retained source faces; gold surfaces are new chamfers. Adjacent cuts meet through plane intersections; they do not produce the spherical corners of Convex Bevel. Selection refers to the original source edges, with coplanar triangle diagonals excluded. Closed-mesh inspection runs on the result. This is a convex planar experiment, not selective rounded beveling or concave mesh editing. Original tools remain unchanged.",
};
export type SelectiveShape = "Box" | "Wedge";
export type EdgeSelection = "Single edge" | "Adjacent pair" | "Corner" | "All edges" | "Angle threshold";
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
/** Presentation presets translate to explicit SDK edge IDs. */
export function selectiveBevelStudy(
  source: BufferGeometry,
  width: number,
  selection: EdgeSelection,
  edgeIndex: number,
  angle = 0,
) {
  const topology = convexEdges(source),
    { edges } = topology;
  const picked = edges[edgeIndex];
  if (!picked) throw new Error("Invalid edge ID.");
  const incident = edges
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.a === picked.a || e.b === picked.a)
    .map(({ i }) => i);
  const edgeIds =
    selection === "Angle threshold"
      ? edges
          .map((e, i) => ({ e, i }))
          .filter(({ e }) => e.angle >= angle)
          .map(({ i }) => i)
      : selection === "All edges"
        ? edges.map((_, i) => i)
        : selection === "Corner"
          ? incident
          : selection === "Adjacent pair"
            ? [edgeIndex, incident.find((i) => i !== edgeIndex)!]
            : [edgeIndex];
  return chamferConvexGeometry(source, { width, edgeIds });
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
    angle: 60,
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
      const result = selectiveBevelStudy(source, params.width, params.selection, params.edge, (params.angle * Math.PI) / 180);
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
      edgeControl.max(convexEdges(s).edges.length - 1);
      s.dispose();
      edgeControl.updateDisplay();
      rebuild();
      frame();
    });
  gui
    .add(params, "selection", ["Single edge", "Adjacent pair", "Corner", "All edges", "Angle threshold"])
    .name("Selection")
    .onChange(rebuild);
  const edgeControl = gui.add(params, "edge", 0, 11, 1).name("Original edge ID").onChange(rebuild);
  gui.add(params, "angle", 0, 180, 1).name("Min normal angle (deg)").onChange(rebuild);
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
