import { MeshPhysicalMaterial } from "three";
import { materialMatrix } from "../../framework/materialMatrix";

export const meta = {
  title: "Material Clearcoat",
  description:
    "Clearcoat strength across columns, coating roughness down rows. The base layer has its own roughness control, independent of the coating. The zero-clearcoat column is the uncoated baseline. Direct lighting only; no environment map.",
};
export default function (container: HTMLElement) {
  return materialMatrix(container, {
    title: meta.title,
    columns: { name: "Clearcoat" },
    rows: { name: "Clearcoat Roughness" },
    makeMaterial: (clearcoat, clearcoatRoughness) =>
      new MeshPhysicalMaterial({ color: 0x4488cc, metalness: 0, roughness: 0.55, clearcoat, clearcoatRoughness }),
    controls(gui, materials) {
      const settings = { color: "#4488cc", roughness: 0.55 };
      gui
        .addColor(settings, "color")
        .name("Base Color")
        .onChange((v: string) => materials.forEach((m) => m.color.set(v)));
      gui
        .add(settings, "roughness", 0, 1, 0.01)
        .name("Base Roughness")
        .onChange((v: number) =>
          materials.forEach((m) => {
            m.roughness = v;
          }),
        );
    },
  });
}
