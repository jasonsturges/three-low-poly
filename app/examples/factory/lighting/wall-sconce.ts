import GUI from "lil-gui";
import { AxesHelper, Color, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { WallSconceGeometry, type WallSconceGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Wall Sconce",
  description:
    "A BufferGeometry with three material groups — 0 mount (plate + bracket), 1 iron frame (cap + bowl), " +
    "2 glass chimney — and the consumer owning the materials, the same shape as the Coach and Hanging " +
    "Lanterns. Origin is the WALL MOUNT POINT: the sconce faces +X from a −X wall, so the plate straddles " +
    "x=0 and the fixture projects out from it. The axes sit there to show where a wall would be, and the " +
    "camera is framed to the object rather than the sconce being nudged into view. Color edits mutate " +
    "materials in place and never rebuild geometry.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0xb8bcc4,
    cameraPosition: [1.2, 0.2, 1.5],
  });
  const { scene, dispose } = handle;

  // The origin is where the fixture meets the wall, so the axes stand in for the wall plane itself.
  const axes = new AxesHelper(0.15);
  scene.add(axes);

  const geometryParams: Required<
    Pick<WallSconceGeometryOptions, "bodyOffsetX" | "chimneyHeight" | "innerScale">
  > = {
    bodyOffsetX: 0.06,
    chimneyHeight: 0.3,
    innerScale: 0.96,
  };

  const colors = { iron: "#1c1e24", glass: "#e8a058" };

  const glass = new Color(colors.glass);

  // Group 0 — mount: the wall plate and the bracket that carries the fixture.
  const mountMaterial = new MeshStandardMaterial({
    color: new Color(colors.iron),
    metalness: 0.65,
    roughness: 0.55,
    flatShading: true,
  });

  // Group 1 — iron frame: the cap above and the bowl below. Its own group so it can be tinted apart
  // from the mount, though both default to the same iron.
  const frameMaterial = new MeshStandardMaterial({
    color: new Color(colors.iron),
    metalness: 0.65,
    roughness: 0.55,
    flatShading: true,
  });

  // Group 2 — the glass chimney. Lit from inside rather than reflecting, as in both lanterns.
  // `toneMapped: false` keeps the emissive off the renderer's tone curve.
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

  const materials = [mountMaterial, frameMaterial, glassMaterial];

  const sconce = new Mesh(new WallSconceGeometry(geometryParams), materials);
  scene.add(sconce);

  // Framed ONCE, and it is the CAMERA that moves — the sconce stays on its mount point at the origin.
  // `frameObject` recomputes distance from the bounding sphere, so calling it per rebuild would steal
  // the viewer's zoom. This is also why the old `position.x = -0.5` nudge is gone: shifting the object
  // to center it is exactly what made the anchor unreadable.
  frameObject(handle, sconce, { fit: 1.6 });

  const rebuild = () => {
    sconce.geometry.dispose();
    sconce.geometry = new WallSconceGeometry(geometryParams);
  };

  const gui = new GUI();
  gui.title("Wall Sconce");

  const frameFolder = gui.addFolder("Frame");
  // How far the body stands off the wall plate.
  frameFolder.add(geometryParams, "bodyOffsetX", 0, 0.2, 0.01).name("Body Offset X").onChange(rebuild);
  frameFolder.add(geometryParams, "chimneyHeight", 0.15, 0.5, 0.01).name("Chimney Height").onChange(rebuild);
  frameFolder.add(geometryParams, "innerScale", 0.8, 1, 0.01).name("Inner Scale").onChange(rebuild);
  frameFolder.open();

  // No rebuild — geometry is untouched by any of these. One control per material group, named for the
  // material rather than the part it covers, matching both lanterns.
  const materialsFolder = gui.addFolder("Materials");
  // Mount and frame are separate groups but default to the same iron, so one control drives both.
  materialsFolder
    .addColor(colors, "iron")
    .name("Iron")
    .onChange(() => {
      mountMaterial.color.set(colors.iron);
      frameMaterial.color.set(colors.iron);
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
    sconce.geometry.dispose();
    materials.forEach((m) => m.dispose());
    axes.dispose();
    dispose();
  };
}
