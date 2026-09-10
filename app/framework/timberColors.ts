import type GUI from "lil-gui";
import { RandomColor, type ColorSampler } from "three-low-poly";

/** Authored host presets, not wood-species simulation or SDK defaults. */
export const timberPalettes = {
  "Warm Brown": { endpoints: ["#493729", "#93714f"] },
  "Light Oak": { endpoints: ["#b99569", "#dfc398"] },
} as const;

export function createTimberColorSettings() {
  return {
    timber: "Warm Brown" as keyof typeof timberPalettes,
    endpointA: "#493729",
    endpointB: "#93714f",
  };
}

export function sampleTimber(settings: ReturnType<typeof createTimberColorSettings>): ColorSampler {
  return RandomColor.between(settings.endpointA, settings.endpointB);
}

/** Same authoring controls for the two floor examples; both pass the result as options.colors. */
export function addTimberColorControls(gui: GUI, settings: ReturnType<typeof createTimberColorSettings>, rebuild: () => void) {
  const folder = gui.addFolder("Color");
  folder
    .add(settings, "timber", Object.keys(timberPalettes))
    .name("Timber preset")
    .onChange(() => {
      [settings.endpointA, settings.endpointB] = timberPalettes[settings.timber].endpoints;
      folder.controllers.forEach((controller) => controller.updateDisplay());
      rebuild();
    });
  folder.addColor(settings, "endpointA").name("Endpoint A").onChange(rebuild);
  folder.addColor(settings, "endpointB").name("Endpoint B").onChange(rebuild);
  folder.open();
}
