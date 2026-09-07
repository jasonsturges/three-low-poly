import { MeshPhysicalMaterial } from "three";
import { materialMatrix } from "../../framework/materialMatrix";

export const meta = {
  title: "Material Anisotropy",
  description:
    "Anisotropy strength across columns, tangent-space rotation down rows. Elongated highlights rotate as the brushed-metal direction changes. The 0-strength column stays isotropic. Shared sphere tangents provide the direction field without a texture. Direct lighting only; no environment map.",
};
export default function (container: HTMLElement) {
  return materialMatrix(container, {
    title: meta.title,
    columns: { name: "Anisotropy" },
    rows: { name: "Rotation (degrees)", min: 0, max: 180, format: (v) => `${v.toFixed(0)}°` },
    makeMaterial: (anisotropy, degrees) =>
      new MeshPhysicalMaterial({
        color: 0xc9a56a,
        metalness: 1,
        roughness: 0.3,
        anisotropy,
        anisotropyRotation: (degrees * Math.PI) / 180,
      }),
    controls(gui, materials) {
      const settings = { color: "#c9a56a", roughness: 0.3 };
      gui
        .addColor(settings, "color")
        .name("Metal Color")
        .onChange((v: string) => materials.forEach((m) => m.color.set(v)));
      gui
        .add(settings, "roughness", 0.05, 1, 0.01)
        .name("Roughness")
        .onChange((v: number) =>
          materials.forEach((m) => {
            m.roughness = v;
          }),
        );
    },
  });
}
