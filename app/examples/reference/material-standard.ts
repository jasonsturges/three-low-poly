import { MeshStandardMaterial } from "three";
import { materialMatrix } from "../../framework/materialMatrix";

export const meta = {
  title: "Material Standard",
  description:
    "Metalness across columns, roughness down rows, in exact 0.1 steps. All samples share geometry, viewing direction, and direct lighting. No environment map is used. Intermediate metalness values are useful for comparison; pure surfaces are usually dielectric (0) or metallic (1).",
};
export default function (container: HTMLElement) {
  return materialMatrix(container, {
    title: meta.title,
    columns: { name: "Metalness" },
    rows: { name: "Roughness" },
    makeMaterial: (metalness, roughness) => new MeshStandardMaterial({ color: 0x4488cc, metalness, roughness }),
    controls(gui, materials) {
      const settings = { color: "#4488cc" };
      gui
        .addColor(settings, "color")
        .name("Base Color")
        .onChange((value: string) => materials.forEach((m) => m.color.set(value)));
    },
  });
}
