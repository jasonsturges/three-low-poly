import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  FrontSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Plane,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { inspectGeometry, sliceGeometry, thickenSurface, triangulateRegion } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "UV Continuity",
  description:
    "STUDY — compare SDK defaults, per-region fitting, and physical texture scale using uv-grid.jpg. Thickness preserves source face UVs but fits each rim loop to 0–1; slice caps use planar coordinates in source units. Units per repeat gives faces, rims, and caps comparable texture density. Magenta lines mark UV discontinuities across geometrically shared edges; these can be intentional unwrap seams. The back retains the source parameterization, so text can read mirrored from outside. Cap rotation changes cap orientation, not source UVs. All surfaces are single-sided. Rim and cap mapping use SDK options; comparison controls and seam rendering remain in the study.",
};
export interface UVStudySettings {
  operation: "Thickness" | "Plane slicing";
  mapping: "SDK defaults" | "Fit each region" | "Units per repeat";
  width: number;
  height: number;
  thickness: number;
  hole: boolean;
  units: number;
  cutAngle: number;
  cutOffset: number;
  capRotation: number;
  phase: number;
}
export const uvStudyDefaults: UVStudySettings = {
  operation: "Thickness",
  mapping: "Units per repeat",
  width: 3,
  height: 2,
  thickness: 0.5,
  hole: true,
  units: 1,
  cutAngle: 0.35,
  cutOffset: 0,
  capRotation: 0,
  phase: 0,
};
/** Fixture-specific UV policies, deliberately separate from the geometry operations under review. */
export function uvStudyBuild(settings: UVStudySettings) {
  const { width, height, thickness, units } = settings;
  if (![width, height, thickness, units].every((v) => Number.isFinite(v) && v > 0))
    throw new Error("Dimensions and units per repeat must be positive.");
  const outline = [
    new Vector2(-width / 2, -height / 2),
    new Vector2(width / 2, -height / 2),
    new Vector2(width / 2, height / 2),
    new Vector2(-width / 2, height / 2),
  ];
  const radius = Math.min(width, height) * 0.22;
  const holes = settings.hole
    ? [
        Array.from(
          { length: 24 },
          (_, i) => new Vector2(radius * Math.cos((i * Math.PI) / 12), radius * Math.sin((i * Math.PI) / 12)),
        ),
      ]
    : [];
  const region = triangulateRegion(outline, holes);
  const source = thickenSurface(
    {
      points: region.points.map((p) => new Vector3(p.x, p.y, 0)),
      triangles: region.triangles,
      uv: region.points.map((p) =>
        settings.mapping === "Units per repeat"
          ? new Vector2((p.x + width / 2) / units, (p.y + height / 2) / units)
          : new Vector2(p.x / width + 0.5, p.y / height + 0.5),
      ),
    },
    { thickness, rimUV: settings.mapping === "Units per repeat" ? { unitsPerRepeat: units } : undefined },
  ).geometry;
  if (settings.operation === "Thickness") return { parts: [source], normal: new Vector3(0, 0, 1), capMaterialIndex: -1 };
  const normal = new Vector3(Math.sin(settings.cutAngle), 0, Math.cos(settings.cutAngle));
  let cut: ReturnType<typeof sliceGeometry>;
  try {
    cut = sliceGeometry(source, new Plane(normal, -settings.cutOffset), {
      capUV:
        settings.mapping === "SDK defaults"
          ? undefined
          : {
              mode: settings.mapping === "Units per repeat" ? "units" : "fit",
              unitsPerRepeat: units,
              rotation: settings.capRotation,
            },
    });
  } finally {
    source.dispose();
  }
  const parts = [cut.positive, cut.negative];
  return { parts, normal, capMaterialIndex: cut.capMaterialIndex };
}
/** Find UV discontinuities, not mere triangle edges or repeated-texture grid lines. */
export function uvStudySeams(geometry: BufferGeometry): Vector3[] {
  const report = inspectGeometry(geometry),
    uv = geometry.getAttribute("uv"),
    index = geometry.index;
  const edges = new Map<string, { a: number; b: number; u: Vector2; v: Vector2 }[]>();
  report.triangles.forEach((tri, f) => {
    for (let k = 0; k < 3; k++) {
      let a = tri[k],
        b = tri[(k + 1) % 3],
        i = index ? index.getX(f * 3 + k) : f * 3 + k,
        j = index ? index.getX(f * 3 + ((k + 1) % 3)) : f * 3 + ((k + 1) % 3);
      if (a > b) {
        [a, b] = [b, a];
        [i, j] = [j, i];
      }
      const key = `${a},${b}`,
        list = edges.get(key) ?? [];
      list.push({ a, b, u: new Vector2(uv.getX(i), uv.getY(i)), v: new Vector2(uv.getX(j), uv.getY(j)) });
      edges.set(key, list);
    }
  });
  return [...edges.values()]
    .filter((e) => e.length === 2 && (e[0].u.distanceTo(e[1].u) > 1e-5 || e[0].v.distanceTo(e[1].v) > 1e-5))
    .flatMap((e) => [report.points[e[0].a], report.points[e[0].b]]);
}
export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [2, 1.5, 5] });
  const key = new DirectionalLight(0xffffff, 2);
  key.position.set(3, 4, 5);
  handle.scene.add(key);
  const texture = new TextureLoader().load(`${import.meta.env.BASE_URL}uv-grid.jpg`);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  const materials = [0xffffff, 0xffffff, 0xffffff, 0xffffff].map(
    (color) => new MeshStandardMaterial({ color, map: texture, side: FrontSide, roughness: 0.8 }),
  );
  const wire = new LineBasicMaterial({ color: 0x152937, transparent: true, opacity: 0.4 }),
    seamMaterial = new LineBasicMaterial({ color: 0xff65d0, depthTest: false, transparent: true, opacity: 0.9 });
  const stage = new Group();
  handle.scene.add(stage);
  const params = { ...uvStudyDefaults, half: "Negative", separation: 0.7, seams: true, wireframe: false, tint: false };
  const gui = new GUI({ width: 340 });
  gui.title("UV Continuity");
  const summary = document.createElement("div");
  summary.style.cssText = "padding:10px;white-space:pre-line;line-height:1.5;font-size:12px";
  summary.setAttribute("role", "status");
  summary.setAttribute("aria-label", "UV measurements");
  const clear = () => {
    stage.traverse((o) => {
      if (o instanceof Mesh || o instanceof LineSegments) o.geometry.dispose();
    });
    stage.clear();
  };
  const layout = () => {
    const w = container.clientWidth,
      h = container.clientHeight,
      panel = Math.min(340, w * 0.45);
    gui.domElement.style.width = `${panel}px`;
    if (w && h) handle.camera.setViewOffset(w, h, panel / 2, 0, w, h);
  };
  const resize = new ResizeObserver(layout);
  resize.observe(container);
  layout();
  const frame = () =>
    frameObject(handle, stage, {
      fit: Math.max(
        1.15,
        (1.15 * container.clientHeight) / Math.max(1, container.clientWidth - Math.min(340, container.clientWidth * 0.45)),
      ),
    });
  const rebuild = () => {
    clear();
    texture.offset.set(params.phase, 0);
    materials.forEach((m, i) => m.color.set(params.tint ? [0xffffff, 0xc6dfff, 0xffd39c, 0xffb9d2][i] : 0xffffff));
    let result: ReturnType<typeof uvStudyBuild>;
    try {
      result = uvStudyBuild(params);
    } catch (error) {
      summary.textContent = `Unable to build this cut: ${(error as Error).message}`;
      return;
    }
    let seams = 0,
      triangles = 0;
    result.parts.forEach((geometry, i) => {
      if (!geometry.getAttribute("position").count) {
        geometry.dispose();
        return;
      }
      if (result.parts.length === 2 && params.half !== "Both" && i !== (params.half === "Positive" ? 0 : 1)) {
        geometry.dispose();
        return;
      }
      const part = new Group();
      if (result.parts.length === 2 && params.half === "Both")
        part.position.copy(result.normal).multiplyScalar(((i === 0 ? 1 : -1) * params.separation) / 2);
      part.add(new Mesh(geometry, materials));
      triangles += geometry.getAttribute("position").count / 3;
      const lines = uvStudySeams(geometry);
      seams += lines.length / 2;
      if (params.seams) part.add(new LineSegments(new BufferGeometry().setFromPoints(lines), seamMaterial));
      if (params.wireframe) part.add(new LineSegments(new WireframeGeometry(geometry), wire));
      stage.add(part);
    });
    summary.textContent = `${params.mapping}\n${triangles} visible triangles · ${seams} UV seam edges\n\n${params.mapping === "Units per repeat" ? `${params.units.toFixed(2)} source units per repeat on all regions.` : "Faces fit their rectangle; each rim loop fits 0–1."}\n${params.operation === "Plane slicing" ? (params.mapping === "SDK defaults" ? "SDK cap: planar UVs in source units." : "Cap mapping is shared by both cut halves.") : "Front/back retain the same source orientation."}\n\nMagenta: UV discontinuities, including intended seams.\nUnit density does not guarantee pattern alignment across seams.\nCap rotation applies to experimental policies only.`;
  };
  gui
    .add(params, "operation", ["Thickness", "Plane slicing"])
    .name("Operation")
    .onChange(() => {
      rebuild();
      frame();
    });
  gui.add(params, "mapping", ["SDK defaults", "Fit each region", "Units per repeat"]).name("UV policy").onChange(rebuild);
  const shape = gui.addFolder("Source panel");
  shape.add(params, "width", 2, 5, 0.1).name("Width").onChange(rebuild);
  shape.add(params, "height", 1.5, 3, 0.1).name("Height").onChange(rebuild);
  shape.add(params, "thickness", 0.15, 1, 0.05).name("Thickness").onChange(rebuild);
  shape.add(params, "hole").name("Hole").onChange(rebuild);
  const mapping = gui.addFolder("Mapping");
  mapping.add(params, "units", 0.25, 2, 0.05).name("Units per repeat").onChange(rebuild);
  mapping.add(params, "phase", 0, 1, 0.01).name("Texture phase U").onChange(rebuild);
  mapping.add(params, "capRotation", -Math.PI, Math.PI, 0.05).name("Cap rotation").onChange(rebuild);
  const cut = gui.addFolder("Plane slicing");
  cut.add(params, "cutAngle", -0.7, 0.7, 0.05).name("Cut tilt").onChange(rebuild);
  cut.add(params, "cutOffset", -0.4, 0.4, 0.02).name("Cut offset").onChange(rebuild);
  cut.add(params, "half", ["Negative", "Positive", "Both"]).name("Show half").onChange(rebuild);
  cut.add(params, "separation", 0, 1.5, 0.05).name("Separation").onChange(rebuild);
  cut.close();
  const view = gui.addFolder("Inspect");
  view.add(params, "seams").name("UV seams").onChange(rebuild);
  view.add(params, "wireframe").name("Wireframe").onChange(rebuild);
  view.add(params, "tint").name("Tint regions").onChange(rebuild);
  view.add({ frame }, "frame").name("Frame study");
  gui.domElement.appendChild(summary);
  rebuild();
  frame();
  return () => {
    resize.disconnect();
    gui.destroy();
    clear();
    texture.dispose();
    materials.forEach((m) => m.dispose());
    wire.dispose();
    seamMaterial.dispose();
    handle.dispose();
  };
}
