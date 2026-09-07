import { MeshPhysicalMaterial } from "three";
import { materialMatrix } from "../../framework/materialMatrix";

export const meta = {
  title: "Material Dielectric",
  description:
    "IOR across columns, roughness down rows. All spheres are opaque nonmetals: metalness and transmission are zero. IOR changes surface reflection even without glass transmission. At IOR 1 the default dielectric specular reflection vanishes. Direct lighting only; no environment map.",
};
export default function (container: HTMLElement) {
  return materialMatrix(container, {
    title: meta.title,
    columns: { name: "IOR", min: 1, max: 2.333, format: (v) => v.toFixed(2) },
    rows: { name: "Roughness" },
    makeMaterial: (ior, roughness) =>
      new MeshPhysicalMaterial({ color: 0x4488cc, metalness: 0, transmission: 0, ior, roughness }),
    controls(gui, materials) {
      const settings = { color: "#4488cc" };
      gui
        .addColor(settings, "color")
        .name("Base Color")
        .onChange((v: string) => materials.forEach((m) => m.color.set(v)));
    },
  });
}
