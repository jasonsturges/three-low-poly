import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  FrontSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  WireframeGeometry,
} from "three";
import { bevelConvexGeometry, inspectGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { meshInspectionOverlay } from "../../../framework/inspection/meshInspectionOverlay";

export const meta = {
  title: "Mesh Inspection",
  description:
    "STUDY — shared mesh diagnostics with deliberate defects. Green edges are boundaries; amber edges have conflicting winding; red edges or points are non-manifold; purple marks duplicate or degenerate triangles. Components connect across geometric edges, including shading seams. Volume is reported per closed, consistently wound component, with its sign retained. It is an algebraic measurement, not certified occupied volume: self-intersections and nested-shell semantics are not checked. Degenerate triangles are excluded from adjacency. All mesh materials are single-sided; a fully reversed shell can be invisible from outside even though its edges are consistently wound. Inspection does not repair geometry.",
};
export const inspectionCases = [
  "Closed box",
  "Open box",
  "Reversed triangle",
  "Inward shell",
  "Duplicate triangle",
  "Degenerate triangle",
  "Two shells",
  "Vertex contact",
  "Beveled solid",
] as const;
export function inspectionSource(kind: (typeof inspectionCases)[number]): BufferGeometry {
  const indexed = new BoxGeometry(2, 2, 2),
    box = indexed.toNonIndexed();
  indexed.dispose();
  if (kind === "Beveled solid") {
    const result = bevelConvexGeometry(box, { radius: 0.22, segments: 3 });
    box.dispose();
    return result.geometry;
  }
  let values = Array.from(box.getAttribute("position").array);
  box.dispose();
  const flip = (i: number) => {
    const b = values.slice(i + 3, i + 6);
    values.splice(i + 3, 3, ...values.slice(i + 6, i + 9));
    values.splice(i + 6, 3, ...b);
  };
  if (kind === "Open box") values = values.slice(18);
  if (kind === "Reversed triangle") flip(0);
  if (kind === "Inward shell") for (let i = 0; i < values.length; i += 9) flip(i);
  if (kind === "Duplicate triangle") values.push(...values.slice(0, 9));
  if (kind === "Degenerate triangle") values.push(-0.8, 1.3, 0, 0, 1.3, 0, 0.8, 1.3, 0);
  if (kind === "Two shells" || kind === "Vertex contact") {
    const offset = kind === "Two shells" ? new Vector3(2.8, 0, 0) : new Vector3(2, 2, 2);
    values.push(...values.map((v, i) => v + offset.getComponent(i % 3)));
  }
  const result = new BufferGeometry().setAttribute("position", new Float32BufferAttribute(values, 3));
  result.computeVertexNormals();
  return result;
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
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.65, side: FrontSide });
  const wire = new LineBasicMaterial({ color: 0x90a6bb, transparent: true, opacity: 0.25 });
  const params = {
    example: "Open box" as (typeof inspectionCases)[number],
    components: true,
    wireframe: true,
    boundaries: true,
    winding: true,
    nonManifold: true,
    problems: true,
  };
  let geometry: BufferGeometry | undefined,
    wireGeometry: WireframeGeometry | undefined,
    overlay: ReturnType<typeof meshInspectionOverlay> | undefined;
  const gui = new GUI({ width: 350 });
  gui.title("Mesh Inspection");
  // Reserve visual space for the readout even in a narrow embedded browser.
  const layout = () => {
    const width = container.clientWidth,
      height = container.clientHeight;
    const panelWidth = Math.min(350, width * 0.45);
    gui.domElement.style.width = `${panelWidth}px`;
    if (width && height) handle.camera.setViewOffset(width, height, panelWidth / 2, 0, width, height);
  };
  const resize = new ResizeObserver(layout);
  resize.observe(container);
  layout();
  const frame = () =>
    frameObject(handle, stage, {
      fit: Math.max(
        1.2,
        (1.2 * container.clientHeight) / Math.max(1, container.clientWidth - Math.min(350, container.clientWidth * 0.45)),
      ),
    });
  const summary = document.createElement("div");
  summary.style.cssText = "padding:12px;line-height:1.6;white-space:pre-line;font-size:12px;";
  summary.setAttribute("role", "status");
  summary.setAttribute("aria-label", "Mesh diagnostics");
  const clear = () => {
    geometry?.dispose();
    wireGeometry?.dispose();
    overlay?.dispose();
    stage.clear();
  };
  const rebuild = () => {
    clear();
    geometry = inspectionSource(params.example);
    const report = inspectGeometry(geometry);
    const colors: number[] = [];
    report.triangles.forEach((_, i) => {
      const id = report.componentOf[i],
        color = params.components && id >= 0 ? new Color().setHSL((0.56 + id * 0.27) % 1, 0.35, 0.57) : new Color(0x79adc4);
      for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b);
    });
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    stage.add(new Mesh(geometry, material));
    if (params.wireframe) {
      wireGeometry = new WireframeGeometry(geometry);
      stage.add(new LineSegments(wireGeometry, wire));
    }
    overlay = meshInspectionOverlay(report, params);
    stage.add(overlay.group);
    const volumes = report.components
      .map(
        (c, i) =>
          `Shell ${i + 1}: ${c.signedVolume === null ? "volume unavailable" : `${c.signedVolume.toFixed(3)} units³ signed${c.signedVolume < 0 ? " · inward winding" : ""}`}`,
      )
      .join("\n");
    summary.textContent = `${report.triangles.length} triangles · ${report.points.length} welded vertices\n${report.components.length} edge-connected components\n\nGreen · ${report.boundary.length} boundary edges\nAmber · ${report.winding.length} winding conflicts\nRed · ${report.nonManifold.length} non-manifold edges\nRed points · ${report.nonManifoldVertices.length} non-manifold vertices\nPurple · ${report.duplicate.length} duplicate triangles\nPurple · ${report.degenerate.length} degenerate triangles\n\n${volumes}\n\nSelf-intersections / shell nesting: not checked.\nDegenerate triangles excluded from connectivity.\nWeld distance: ${report.tolerance.toExponential(2)}`;
  };
  gui
    .add(params, "example", inspectionCases)
    .name("Test mesh")
    .onChange(() => {
      rebuild();
      frame();
    });
  const inspect = gui.addFolder("Diagnostic overlays");
  for (const [prop, label] of [
    ["components", "Color components"],
    ["wireframe", "Wireframe"],
    ["boundaries", "Boundary edges"],
    ["winding", "Winding conflicts"],
    ["nonManifold", "Non-manifold edges"],
    ["problems", "Problem triangles / vertices"],
  ] as const)
    inspect.add(params, prop).name(label).onChange(rebuild);
  inspect.add({ frame }, "frame").name("Frame study");
  gui.domElement.appendChild(summary);
  rebuild();
  frame();
  return () => {
    clear();
    resize.disconnect();
    gui.destroy();
    material.dispose();
    wire.dispose();
    handle.dispose();
  };
}
