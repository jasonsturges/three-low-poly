import GUI from "lil-gui";
import { AxesHelper, Color, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { HangingLanternGeometry, type HangingLanternGeometryOptions } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Hanging Lantern",
  description:
    "A BufferGeometry with three material groups — 0 mount (chain + cap), 1 cage struts, 2 inner lamp — " +
    "and the consumer owning the materials, exactly as the Coach Lantern does. Origin is the HANG POINT " +
    "at the top of the chain, so the lantern hangs into −Y and `drop` lengthens the chain downward " +
    "without moving where it attaches to the ceiling. That is why the axes sit at the origin and the " +
    "camera looks up from below, rather than the lantern being nudged into view. Colour and emissive " +
    "edits mutate materials in place and never rebuild geometry.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0xb8bcc4,
    cameraPosition: [3.2, -1.2, 4.4],
  });

  // The origin is the hang point, so the lantern hangs below it — no ground grid, and axes at the
  // origin show exactly where a ceiling or bracket would attach.
  const axes = new AxesHelper(0.6);
  scene.add(axes);

  const geometryParams: Required<
    Pick<
      HangingLanternGeometryOptions,
      "drop" | "chainWidth" | "cageRadius" | "cageStretch" | "cageGap" | "cageBarWidth" | "innerScale"
    >
  > = {
    drop: 3,
    chainWidth: 0.05,
    cageRadius: 0.42,
    cageStretch: 1.4,
    cageGap: 0,
    cageBarWidth: 0.03,
    innerScale: 0.96,
  };

  const colors = { iron: "#171a1f", glass: "#ffb45a" };

  const glass = new Color(colors.glass);

  // Group 0 — mount: the chain and the cap it hangs from.
  const mountMaterial = new MeshStandardMaterial({
    color: new Color(colors.iron),
    metalness: 0.7,
    roughness: 0.5,
    flatShading: true,
  });

  // Group 1 — the open cage struts. Separate from the mount so the two can be tinted apart, even
  // though they default to the same iron.
  const cageMaterial = new MeshStandardMaterial({
    color: new Color(colors.iron),
    metalness: 0.7,
    roughness: 0.5,
    flatShading: true,
  });

  // Group 2 — the inner lamp, which in the iron/glass/wax vocabulary IS the glass: lit from inside
  // rather than reflecting, the same read as the Coach Lantern's panes. `toneMapped: false` keeps the
  // emissive from being crushed by the renderer's tone curve; DoubleSide because the octahedron is
  // read from both faces.
  const glassMaterial = new MeshStandardMaterial({
    color: glass,
    emissive: glass,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.88,
    roughness: 0.35,
    metalness: 0,
    flatShading: true,
    side: DoubleSide,
    toneMapped: false,
  });

  const materials = [mountMaterial, cageMaterial, glassMaterial];

  const lantern = new Mesh(new HangingLanternGeometry(geometryParams), materials);
  scene.add(lantern);

  // Aim HALFWAY down the drop, derived from the geometry's own cage anchor. Aiming straight at the
  // cage would push the origin marker out to the frame edge — at the default drop the cage sits 3.5
  // units below the hang point — and the whole point of this example is that you can see both: the
  // fixed attachment at 0,0,0 and the lantern hanging off it. The lantern stays put and the CAMERA
  // moves, which is what keeps the origin meaningful. Aimed once: re-aiming per rebuild would steal
  // the viewer's orbit every time `drop` changed.
  controls.target.set(0, lantern.geometry.cageCenterY / 2, 0);
  controls.update();

  const rebuild = () => {
    lantern.geometry.dispose();
    lantern.geometry = new HangingLanternGeometry(geometryParams);
  };

  const gui = new GUI();
  gui.title("Hanging Lantern");

  const frameFolder = gui.addFolder("Frame");
  // The hang point does not move — this lengthens the chain downward from it.
  frameFolder.add(geometryParams, "drop", 0.5, 6, 0.1).name("Drop").onChange(rebuild);
  frameFolder.add(geometryParams, "chainWidth", 0.02, 0.15, 0.01).name("Chain Width").onChange(rebuild);
  frameFolder.add(geometryParams, "cageRadius", 0.15, 0.8, 0.01).name("Cage Radius").onChange(rebuild);
  frameFolder.add(geometryParams, "cageStretch", 0.8, 2.5, 0.05).name("Cage Stretch").onChange(rebuild);
  frameFolder.add(geometryParams, "cageGap", 0, 0.5, 0.01).name("Cage Gap").onChange(rebuild);
  frameFolder.add(geometryParams, "cageBarWidth", 0.01, 0.08, 0.005).name("Cage Bar Width").onChange(rebuild);
  frameFolder.add(geometryParams, "innerScale", 0.8, 1, 0.01).name("Inner Scale").onChange(rebuild);
  frameFolder.open();

  // No rebuild — geometry is untouched by any of these. Same grouping as the Coach Lantern: one
  // control per material group, named for the material rather than the part it happens to cover.
  const materialsFolder = gui.addFolder("Materials");
  // Mount and cage are separate groups but default to the same iron, so one control drives both.
  materialsFolder
    .addColor(colors, "iron")
    .name("Iron")
    .onChange(() => {
      mountMaterial.color.set(colors.iron);
      cageMaterial.color.set(colors.iron);
    });
  materialsFolder
    .addColor(colors, "glass")
    .name("Glass")
    .onChange(() => {
      glassMaterial.color.set(colors.glass);
      glassMaterial.emissive.set(colors.glass);
    });
  // Bound straight to the material — the glass is already `transparent`, so this only needs the value.
  materialsFolder.add(glassMaterial, "opacity", 0, 1, 0.01).name("Glass Opacity");
  materialsFolder.open();

  return () => {
    gui.destroy();
    lantern.geometry.dispose();
    materials.forEach((m) => m.dispose());
    axes.dispose();
    dispose();
  };
}
