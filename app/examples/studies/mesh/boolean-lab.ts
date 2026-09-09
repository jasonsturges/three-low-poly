import { BoxGeometry, CylinderGeometry } from "three";
import { booleanGeometry, type BooleanOperation } from "three-low-poly";
import { modelingLabView } from "../../../experiments/modelingLabView";
export const meta = {
  title: "Boolean Lab",
  description:
    "SDK-backed STUDY — our own small BSP polygon splitter, without an external Boolean library. Union, intersection, and subtraction of closed low-poly solids. Blue surfaces originate on A, terracotta on B; subtraction reverses B walls. UVs and normals interpolate across splits. Topology diagnostics remain visible because coplanar, tangent and near-coincident configurations can fail. Size-limited SDK solver with explicit topology diagnostics. Opacity reveals the result and source wireframes while keeping faces single-sided.",
};
export const booleanDefaults = {
  operation: "Subtract" as BooleanOperation,
  cutter: "Cylinder",
  offset: 0.2,
  rotation: 0.2,
  radius: 0.5,
  facets: 12,
};
export function booleanOperands(settings = booleanDefaults) {
  const a = new BoxGeometry(2, 1.6, 1.4);
  const b =
    settings.cutter === "Cylinder"
      ? new CylinderGeometry(settings.radius, settings.radius, 2.4, settings.facets, 1)
      : new BoxGeometry(1.2, 2.4, 1.1);
  b.rotateX(Math.PI / 2);
  b.rotateY(settings.rotation);
  b.translate(settings.offset, 0.1, 0);
  return { a, b };
}
export default function (container: HTMLElement) {
  const params = { ...booleanDefaults };
  return modelingLabView(
    container,
    "Boolean Lab",
    () => {
      const { a, b } = booleanOperands(params);
      try {
        const result = booleanGeometry(a, b, params.operation, { materialIndices: { a: 0, b: 1 }, onInvalid: "report" });
        return {
          geometry: result.geometry,
          guides: [a, b],
          message: `${params.operation} · A ${params.operation === "Subtract" ? "−" : params.operation === "Union" ? "∪" : "∩"} B\nBlue = A · terracotta = B\n${result.diagnostics.topologyValid ? "Topology checks passed." : "Topology check FAILED — inspect highlighted defects."}\nSDK BSP solver · size-limited.`,
        };
      } catch (error) {
        a.dispose();
        b.dispose();
        throw error;
      }
    },
    (gui, rebuild) => {
      gui.add(params, "operation", ["Subtract", "Intersection", "Union"]).name("Operation").onChange(rebuild);
      gui.add(params, "cutter", ["Cylinder", "Box"]).name("Operand B").onChange(rebuild);
      gui.add(params, "offset", -1.8, 1.8, 0.1).name("B horizontal offset").onChange(rebuild);
      gui.add(params, "rotation", 0, 0.7, 0.05).name("B rotation").onChange(rebuild);
      gui.add(params, "radius", 0.25, 0.8, 0.05).name("Cylinder radius").onChange(rebuild);
      gui.add(params, "facets", 6, 20, 2).name("Cylinder facets").onChange(rebuild);
    },
  );
}
