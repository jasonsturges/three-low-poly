import { MeshPhysicalNodeMaterial } from "three/webgpu";
import { uniform } from "three/tsl";
import { materialMatrix } from "../../framework/materialMatrix";

export const meta = {
  title: "Material Iridescence",
  description:
    "Iridescence strength across columns, film thickness (nanometers) down rows. Film IOR is adjustable within 1…2.333; base roughness is independent. Without a thickness map, Three.js uses the upper thickness bound. Direct lighting only; no environment map.",
};
export default function (container: HTMLElement) {
  return materialMatrix(container, {
    title: meta.title,
    columns: { name: "Iridescence" },
    rows: { name: "Film Thickness (nm)", min: 100, max: 500, format: (v) => v.toFixed(0) },
    makeMaterial: (iridescence, thickness) => {
      const material = new MeshPhysicalNodeMaterial({
        color: 0x222222,
        metalness: 0,
        roughness: 0.3,
        iridescence,
        iridescenceIOR: 1.8,
        iridescenceThicknessRange: [thickness, thickness],
      });
      // Explicit per-material node avoids capturing another sample's thickness array in a shared shader.
      material.iridescenceThicknessNode = uniform(thickness);
      return material;
    },
    controls(gui, materials) {
      const settings = { color: "#222222", ior: 1.8, roughness: 0.3, metalness: 0 };
      gui
        .addColor(settings, "color")
        .name("Base Color")
        .onChange((v: string) => materials.forEach((m) => m.color.set(v)));
      gui
        .add(settings, "ior", 1, 2.333, 0.001)
        .name("Film IOR")
        .onChange((v: number) =>
          materials.forEach((m) => {
            m.iridescenceIOR = v;
          }),
        );
      gui
        .add(settings, "roughness", 0, 1, 0.01)
        .name("Base Roughness")
        .onChange((v: number) =>
          materials.forEach((m) => {
            m.roughness = v;
          }),
        );
      gui
        .add(settings, "metalness", 0, 1, 0.01)
        .name("Base Metalness")
        .onChange((v: number) =>
          materials.forEach((m) => {
            m.metalness = v;
          }),
        );
    },
  });
}
