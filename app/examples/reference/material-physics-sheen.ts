import { MeshPhysicalMaterial } from "three";
import { materialMatrix } from "../../framework/materialMatrix";

export const meta = {
  title: "Material Sheen",
  description:
    "Sheen strength across columns, sheen roughness down rows. Blue with yellow sheen distinguishes the layers; the fabric preset offers a subtler combination. Base roughness remains 1. Direct lighting only; no environment map.",
};
export default function (container: HTMLElement) {
  return materialMatrix(container, {
    title: meta.title,
    columns: { name: "Sheen" },
    rows: { name: "Sheen Roughness" },
    makeMaterial: (sheen, sheenRoughness) =>
      new MeshPhysicalMaterial({ color: 0x0077ff, metalness: 0, roughness: 1, sheenColor: 0xffff00, sheen, sheenRoughness }),
    controls(gui, materials) {
      const settings = { color: "#0077ff", sheenColor: "#ffff00", preset: "Contrasting Layers" };
      const apply = () =>
        materials.forEach((m) => {
          m.color.set(settings.color);
          m.sheenColor.set(settings.sheenColor);
        });
      gui
        .add(settings, "preset", ["Contrasting Layers", "Burgundy Fabric"])
        .name("Palette")
        .onChange((v: string) => {
          settings.color = v === "Burgundy Fabric" ? "#601b38" : "#0077ff";
          settings.sheenColor = v === "Burgundy Fabric" ? "#dca2b8" : "#ffff00";
          apply();
        });
      gui.addColor(settings, "color").name("Base Color").listen().onChange(apply);
      gui.addColor(settings, "sheenColor").name("Sheen Color").listen().onChange(apply);
    },
  });
}
