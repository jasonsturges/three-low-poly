import GUI from "lil-gui";
import {
  BufferGeometry,
  Color,
  DirectionalLight,
  FrontSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Plane,
  PlaneHelper,
  Vector3,
  WireframeGeometry,
} from "three";
import { inspectGeometry, sliceGeometry } from "three-low-poly";
import { slicingSource, type SlicePreset } from "./plane-slicing";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Plane Workflows",
  description:
    "STUDY — repeated halfspace cuts, trimming to a convex six-plane region, and parallel cross-sections. Kept geometry lies on the negative side of each outward plane; plane-normal indicators point toward the removed positive side. Each new cap has a step color, and removed pieces can be exploded. Step contours are historical intersections at that step, not necessarily boundaries of the final result. Section mode samples the original source independently and reports enclosed cap area with holes. These workflows use SDK slicing and inspection, not arbitrary mesh-mesh CSG. Every solid material is single-sided. Volume is an algebraic measurement, not a self-intersection certificate.",
};
export type PlaneWorkflowMode = "Repeated cuts" | "Convex trim" | "Sections";
export interface PlaneWorkflowSettings {
  mode: PlaneWorkflowMode;
  steps: number;
  angle: number;
  offset: number;
  regionSize: number;
  sections: number;
  spacing: number;
}
export const planeWorkflowDefaults: PlaneWorkflowSettings = {
  mode: "Repeated cuts",
  steps: 2,
  angle: 0.3,
  offset: 0,
  regionSize: 1,
  sections: 5,
  spacing: 0.25,
};
export function workflowPlanes(settings: PlaneWorkflowSettings): Plane[] {
  const { angle, offset, regionSize } = settings;
  if (settings.mode === "Sections")
    return Array.from(
      { length: settings.sections },
      (_, i) =>
        new Plane(
          new Vector3(Math.sin(angle), 0, Math.cos(angle)),
          -offset - (i - (settings.sections - 1) / 2) * settings.spacing,
        ),
    );
  if (settings.mode === "Repeated cuts")
    return [
      new Plane(new Vector3(1, 0, 0), -0.75 - offset),
      new Plane(new Vector3(0, 1, 0), -0.5 - offset),
      new Plane(new Vector3(Math.sin(angle), 0, Math.cos(angle)), -0.35 - offset),
    ];
  return [
    new Vector3(1, 0, 0),
    new Vector3(-1, 0, 0),
    new Vector3(0, 1, 0),
    new Vector3(0, -1, 0),
    new Vector3(0, 0, 1),
    new Vector3(0, 0, -1),
  ].map((n, i) => {
    n.applyAxisAngle(new Vector3(0, 0, 1), angle);
    return new Plane(n, -[0.75, 0.75, 0.6, 0.6, 0.5, 0.5][i] * regionSize - n.x * offset);
  });
}
export function workflowVolume(geometry: BufferGeometry): number | null {
  if (!geometry.getAttribute("position")?.count) return 0;
  const report = inspectGeometry(geometry);
  return report.components.every((c) => c.closed && c.signedVolume !== null)
    ? report.components.reduce((sum, c) => sum + c.signedVolume!, 0)
    : null;
}
export interface WorkflowCut {
  plane: Plane;
  loops: Vector3[][];
  holes: number;
  area: number;
  removedVolume: number | null;
}
/** Study orchestration owns its outputs; original source remains untouched. */
export function planeWorkflow(source: BufferGeometry, settings: PlaneWorkflowSettings) {
  if (
    !["Repeated cuts", "Convex trim", "Sections"].includes(settings.mode) ||
    ![settings.angle, settings.offset, settings.regionSize, settings.spacing].every(Number.isFinite) ||
    settings.regionSize <= 0 ||
    settings.spacing <= 0 ||
    !Number.isInteger(settings.sections) ||
    settings.sections < 1 ||
    settings.sections > 15 ||
    !Number.isInteger(settings.steps) ||
    settings.steps < 0 ||
    settings.steps > 6
  )
    throw new Error("Invalid workflow settings.");
  const planes = workflowPlanes(settings),
    cuts: WorkflowCut[] = [],
    offcuts: BufferGeometry[] = [],
    sourceVolume = workflowVolume(source);
  let geometry = source.clone();
  geometry.clearGroups();
  geometry.addGroup(0, geometry.index?.count ?? geometry.getAttribute("position").count, 0);
  try {
    if (settings.mode === "Sections") {
      for (const plane of planes) {
        const cut = (() => {
          try {
            return sliceGeometry(geometry, plane);
          } catch (error) {
            throw new Error(`Plane ${cuts.length + 1}: ${(error as Error).message}`);
          }
        })();
        cuts.push({ plane: plane.clone(), loops: cut.loops, holes: cut.holes, area: cut.capArea, removedVolume: null });
        cut.positive.dispose();
        cut.negative.dispose();
      }
    } else {
      for (const plane of planes.slice(0, settings.steps)) {
        if (!geometry.getAttribute("position").count) break;
        const cut = (() => {
          try {
            return sliceGeometry(geometry, plane);
          } catch (error) {
            throw new Error(`Plane ${cuts.length + 1}: ${(error as Error).message}`);
          }
        })();
        const step = cuts.length + 1;
        for (const part of [cut.negative, cut.positive])
          part.groups.forEach((g) => {
            if (g.materialIndex === cut.capMaterialIndex) g.materialIndex = step;
          });
        offcuts.push(cut.positive);
        geometry.dispose();
        geometry = cut.negative;
        cuts.push({
          plane: plane.clone(),
          loops: cut.loops,
          holes: cut.holes,
          area: cut.capArea,
          removedVolume: workflowVolume(cut.positive),
        });
      }
    }
    return { geometry, offcuts, cuts, planes, sourceVolume, remainingVolume: workflowVolume(geometry) };
  } catch (error) {
    geometry.dispose();
    offcuts.forEach((g) => g.dispose());
    throw error;
  }
}
const palette = [
  0x79adc4, 0xd6b473, 0xc68b82, 0x8ebf9b, 0x9f9bcf, 0x67bbc6, 0xd99dc0, 0xb7c574, 0xa2b2c5, 0xd29864, 0x9bbfa1, 0xab8fae,
  0x78afbd, 0xc2b07b, 0xc9919c, 0x8eaed2,
];
export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [3, 2.5, 5] });
  const key = new DirectionalLight(0xffeee0, 2);
  key.position.set(3, 5, 4);
  const fill = new DirectionalLight(0xb4ccff, 1.5);
  fill.position.set(-3, -2, -4);
  handle.scene.add(key, fill);
  const stage = new Group();
  handle.scene.add(stage);
  const materials = palette.map((color) => new MeshStandardMaterial({ color, roughness: 0.65, side: FrontSide }));
  const lineMaterials = palette.map(
    (color) => new LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 }),
  );
  const ghost = new LineBasicMaterial({ color: 0xb3c2d2, transparent: true, opacity: 0.25 });
  const params = {
    ...planeWorkflowDefaults,
    source: "Box" as SlicePreset,
    removed: false,
    explode: 0.7,
    contours: true,
    planes: false,
    wireframe: false,
    original: true,
  };
  const gui = new GUI({ width: 350 });
  gui.title("Plane Workflows");
  const summary = document.createElement("div");
  summary.style.cssText = "padding:12px;line-height:1.5;white-space:pre-line;font-size:12px;max-height:270px;overflow:auto";
  summary.setAttribute("role", "status");
  summary.setAttribute("aria-label", "Cut measurements");
  let result: ReturnType<typeof planeWorkflow> | undefined;
  const extras: BufferGeometry[] = [],
    helpers: PlaneHelper[] = [];
  const clear = () => {
    result?.geometry.dispose();
    result?.offcuts.forEach((g) => g.dispose());
    result = undefined;
    extras.forEach((g) => g.dispose());
    extras.length = 0;
    helpers.forEach((h) => h.dispose());
    helpers.length = 0;
    stage.clear();
  };
  const layout = () => {
    const w = container.clientWidth,
      h = container.clientHeight,
      p = Math.min(350, w * 0.45);
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
        (1.2 * container.clientHeight) / Math.max(1, container.clientWidth - Math.min(350, container.clientWidth * 0.45)),
      ),
    });
  const wire = (geometry: BufferGeometry) => {
    const g = new WireframeGeometry(geometry);
    extras.push(g);
    stage.add(new LineSegments(g, ghost));
  };
  const rebuild = () => {
    clear();
    const source = slicingSource(params.source);
    try {
      result = planeWorkflow(source, params);
      if (params.original || params.mode === "Sections") wire(source);
      if (params.mode !== "Sections" && result.geometry.getAttribute("position").count) {
        stage.add(new Mesh(result.geometry, materials));
        if (params.wireframe) wire(result.geometry);
      }
      if (params.removed && params.mode !== "Sections")
        result.offcuts.forEach((geometry, i) => {
          if (!geometry.getAttribute("position").count) return;
          const mesh = new Mesh(geometry, materials);
          mesh.position.copy(result!.cuts[i].plane.normal).multiplyScalar(params.explode);
          stage.add(mesh);
        });
      if (params.contours)
        result.cuts.forEach((cut, i) => {
          const points = cut.loops.flatMap((loop) => loop.flatMap((p, j) => [p, loop[(j + 1) % loop.length]]));
          const geometry = new BufferGeometry().setFromPoints(points);
          extras.push(geometry);
          stage.add(new LineSegments(geometry, lineMaterials[i + 1]));
        });
      if (params.planes) {
        const active = params.mode === "Sections" ? result.planes : result.planes.slice(0, params.steps);
        active.forEach((plane, i) => {
          const helper = new PlaneHelper(plane, 3.5, new Color(palette[i + 1]));
          helpers.push(helper);
          stage.add(helper);
        });
      }
      const format = (v: number | null) => (v === null ? "unavailable" : v.toFixed(3));
      const removed = result.cuts.every((c) => c.removedVolume !== null)
        ? result.cuts.reduce((sum, c) => sum + c.removedVolume!, 0)
        : null;
      summary.textContent = `${params.mode}\n${params.mode === "Sections" ? "Independent sections of original source" : `Source ${format(result.sourceVolume)} → kept ${format(result.remainingVolume)} units³\nRemoved ${format(removed)} units³`}\n\n${result.cuts.map((c, i) => `${i + 1}: ${c.loops.length} loops · ${c.holes} holes\n    area ${c.area.toFixed(3)} units²`).join("\n")}\n\n${params.mode === "Sections" ? "Contours lie on each sampling plane." : "Negative halfspaces are retained."}\n${params.mode === "Sections" ? "No source geometry is modified." : "Contours show each step, before later cuts.\nCaps are colored by cutting step."}\nSelf-intersections and cavity semantics are not checked.`;
    } catch (error) {
      summary.textContent = (error as Error).message;
      wire(source);
    }
    source.dispose();
  };
  gui
    .add(params, "source", ["Box", "Torus", "Perforated panel"])
    .name("Source mesh")
    .onChange(() => {
      rebuild();
      frame();
    });
  gui
    .add(params, "mode", ["Repeated cuts", "Convex trim", "Sections"])
    .name("Workflow")
    .onChange(() => {
      params.steps = params.mode === "Convex trim" ? 6 : 3;
      step.max(params.mode === "Convex trim" ? 6 : 3).updateDisplay();
      rebuild();
      frame();
    });
  const step = gui.add(params, "steps", 0, 3, 1).name("Apply first N cuts").onChange(rebuild);
  const cut = gui.addFolder("Planes");
  cut.add(params, "angle", -0.7, 0.7, 0.05).name("Tilt / region rotation").onChange(rebuild);
  cut.add(params, "offset", -1.5, 1.5, 0.05).name("Offset").onChange(rebuild);
  cut.add(params, "regionSize", 0.4, 1.8, 0.05).name("Region size").onChange(rebuild);
  cut.add(params, "sections", 1, 9, 1).name("Section count").onChange(rebuild);
  cut.add(params, "spacing", 0.08, 0.5, 0.02).name("Section spacing").onChange(rebuild);
  const view = gui.addFolder("Inspect");
  for (const [prop, label] of [
    ["removed", "Show removed pieces"],
    ["contours", "Intersection contours"],
    ["planes", "Plane helpers"],
    ["original", "Original wireframe"],
    ["wireframe", "Result wireframe"],
  ] as const)
    view.add(params, prop).name(label).onChange(rebuild);
  view.add(params, "explode", 0, 1.5, 0.05).name("Explode offcuts").onChange(rebuild);
  view.add({ frame }, "frame").name("Frame study");
  gui.domElement.appendChild(summary);
  rebuild();
  frame();
  return () => {
    resize.disconnect();
    gui.destroy();
    clear();
    [...materials, ...lineMaterials, ghost].forEach((m) => m.dispose());
    handle.dispose();
  };
}
