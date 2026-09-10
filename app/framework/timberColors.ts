import type GUI from "lil-gui";
import { RandomColor, type ColorSampler } from "three-low-poly";

/** Authored host presets, not wood-species simulation or SDK defaults. */
export const timberPalettes = {
  "Warm brown": {
    endpoints: ["#493729", "#93714f"],
    families: [
      ["#60452f", "#896647"],
      ["#694c34", "#947052"],
      ["#705239", "#9d7858"],
    ],
  },
  "Light oak": {
    endpoints: ["#b99569", "#dfc398"],
    families: [
      ["#b99569", "#d5b486"],
      ["#c5a477", "#dfc398"],
      ["#cdb18b", "#e5ceb0"],
    ],
  },
} as const;

export function createTimberColorSettings() {
  return {
    timber: "Warm brown" as keyof typeof timberPalettes,
    coloring: "Two endpoints",
    endpointA: "#493729",
    endpointB: "#93714f",
  };
}

export function sampleTimber(settings: ReturnType<typeof createTimberColorSettings>): ColorSampler {
  if (settings.coloring === "Timber families") {
    return RandomColor.mix(
      timberPalettes[settings.timber].families.map(([a, b]) => RandomColor.between(a, b)),
      [5, 3, 2],
    );
  }
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
  const method = folder.add(settings, "coloring", ["Two endpoints", "Timber families"]).name("Coloring");
  const a = folder.addColor(settings, "endpointA").name("Endpoint A").onChange(rebuild);
  const b = folder.addColor(settings, "endpointB").name("Endpoint B").onChange(rebuild);
  const update = () => {
    a.show(settings.coloring === "Two endpoints");
    b.show(settings.coloring === "Two endpoints");
  };
  method.onChange(() => {
    update();
    rebuild();
  });
  update();
  folder.open();
}
