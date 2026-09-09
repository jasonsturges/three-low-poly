import { BufferGeometry, Plane, Vector2, Vector3 } from "three";
import { bendGeometry, clipGeometryByPlanes, sectionGeometry, thickenSurface } from "three-low-poly";
import { modelingLabView } from "../../../experiments/modelingLabView";

export const meta = {
  title: "Duct Composition",
  description:
    "STUDY — a periodic cylinder sheet is thickened, bent, and trimmed to mounting planes using SDK operations. Cross-sections measure the wall annulus. Source UVs use an explicit seam after thickening, before deformation; new cuts use planar cap UVs. Single-sided materials distinguish outer skin, inner skin, rims and cut caps. This combines existing tools; no new SDK API.",
};
export const ductDefaults = { thickness: 0.12, angle: 0.9, trim: 1.35, tilt: 0.15, segments: 24, stage: "Trimmed" };
export function buildDuct(settings = ductDefaults) {
  const { thickness, angle, trim, tilt, segments } = settings;
  if (
    !Number.isInteger(segments) ||
    segments < 8 ||
    segments > 48 ||
    ![thickness, angle, trim, tilt].every(Number.isFinite) ||
    thickness < 0.04 ||
    thickness > 0.25 ||
    Math.abs(angle) > 1.4 ||
    trim < 0.9 ||
    trim > 1.5 ||
    Math.abs(tilt) > 0.3 ||
    !["Thickened", "Bent", "Trimmed"].includes(settings.stage)
  )
    throw new Error("Unsupported duct settings.");
  const points: Vector3[] = [],
    uv: Vector2[] = [],
    triangles: [number, number, number][] = [];
  const rings = 24;
  for (let i = 0; i <= rings; i++)
    for (let j = 0; j < segments; j++) {
      const theta = (j / segments) * Math.PI * 2;
      points.push(new Vector3((i / rings) * 4 - 2, 0.55 * Math.cos(theta), 0.55 * Math.sin(theta)));
      uv.push(new Vector2((i / rings) * 4, j / segments));
    }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < segments; j++) {
      const a = i * segments + j,
        b = i * segments + ((j + 1) % segments),
        c = a + segments,
        d = b + segments;
      triangles.push([a, b, c], [b, d, c]);
    }
  const thick = thickenSurface(
    { points, triangles, uv },
    { thickness, offset: "crease-compensated", rimUV: { unitsPerRepeat: 1 } },
  ).geometry;
  // Explicit UV seam on nonindexed skin triangles, keeping periodic source topology intact.
  const tex = thick.getAttribute("uv");
  for (const group of thick.groups)
    if ((group.materialIndex ?? 0) < 2)
      for (let i = group.start; i < group.start + group.count; i += 3) {
        const values = [tex.getY(i), tex.getY(i + 1), tex.getY(i + 2)];
        if (Math.max(...values) - Math.min(...values) > 0.5)
          for (let k = 0; k < 3; k++) if (values[k] < 0.5) tex.setY(i + k, values[k] + 1);
      }
  if (settings.stage === "Thickened")
    return { geometry: thick, message: "1 / 3 · Oriented tube sheet → thickness\nOuter and inner skins joined by annular rims." };
  let bent;
  try {
    bent = bendGeometry(thick, { axis: "X", angle, normals: "Jacobian" }).geometry;
  } finally {
    thick.dispose();
  }
  if (settings.stage === "Bent")
    return { geometry: bent, message: "2 / 3 · Thickness → bend\nExisting vertices and UVs travel along a circular guide." };
  try {
    const result = clipGeometryByPlanes(bent, [
      new Plane(new Vector3(1, tilt, 0).normalize(), -trim),
      new Plane(new Vector3(-1, tilt, 0).normalize(), -trim),
    ]);
    result.offcuts.forEach((g) => g.dispose());
    try {
      const section = sectionGeometry(result.geometry, new Plane(new Vector3(1, 0, 0), 0));
      return {
        geometry: result.geometry,
        guides: [bent.clone()],
        contours: [
          new BufferGeometry().setFromPoints(
            section.loops.flatMap((loop) => loop.flatMap((p, i) => [p, loop[(i + 1) % loop.length]])),
          ),
        ],
        message: `3 / 3 · Thickness → bend → mounting cuts\nCenter section: ${section.loops.length} loops · ${section.holes} hole\nWall area ${section.area.toFixed(4)} units²`,
      };
    } catch (error) {
      result.geometry.dispose();
      throw error;
    }
  } finally {
    bent.dispose();
  }
}
export default function (container: HTMLElement) {
  const params = { ...ductDefaults };
  return modelingLabView(
    container,
    "Duct Composition",
    () => buildDuct(params),
    (gui, rebuild) => {
      gui.add(params, "stage", ["Thickened", "Bent", "Trimmed"]).name("Pipeline stage").onChange(rebuild);
      gui.add(params, "thickness", 0.04, 0.25, 0.01).name("Wall thickness").onChange(rebuild);
      gui.add(params, "angle", 0, 1.4, 0.1).name("Bend angle").onChange(rebuild);
      gui.add(params, "trim", 0.9, 1.5, 0.05).name("Mounting distance").onChange(rebuild);
      gui.add(params, "tilt", -0.3, 0.3, 0.05).name("Mounting tilt").onChange(rebuild);
      gui.add(params, "segments", 8, 32, 4).name("Radial facets").onChange(rebuild);
    },
  );
}
