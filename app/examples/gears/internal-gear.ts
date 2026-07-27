import GUI from "lil-gui";
import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import { InternalGearGeometry, type InternalGearGeometryOptions } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";

export const meta = {
  title: "Internal Gear",
  description:
    "A ring whose OPENING is toothed, teeth pointing inward — the ring of a planetary set, and the mating half " +
    "of an internal pair. Where the Gear makes its teeth the outer contour and cuts a bore, this inverts the " +
    "roles: the outer contour is a plain circle and the TEETH ARE THE HOLE. So there is no bore to guard here — " +
    "the opening is the toothing, and the question of a bore reaching past the tooth tips never arises. The " +
    "tooth period is the Gear's, unchanged; only the radii swap roles, with the TIP as the inner extreme and " +
    "the ROOT as the outer, because the teeth grow inward. An externally toothed ring needs nothing new — that " +
    "is the Gear with a bore set just inside its valley radius.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [1.6, 1.3, 2.2] });
  const { scene, dispose } = handle;

  const axes = new AxesHelper(1.3);
  scene.add(axes);

  const params: Required<InternalGearGeometryOptions> = {
    teeth: 36,
    tipRadius: 0.72,
    rootRadius: 0.85,
    rimRadius: 1,
    rimSides: 48,
    tipWidth: 0.25,
    valleyWidth: 0.25,
    lean: 0,
    rotation: 0,
    depth: 0.25,
  };

  const colors = { steel: "#8f97a1" };
  const stats = { triangles: 0, tip: "", rim: "", toothDepth: "" };

  const steel = new MeshStandardMaterial({
    color: new Color(colors.steel),
    metalness: 0.75,
    roughness: 0.4,
    flatShading: true,
  });

  const ring = new Mesh(new InternalGearGeometry(params), steel);
  ring.castShadow = ring.receiveShadow = true;
  scene.add(ring);

  const refresh = () => {
    const g = ring.geometry as InternalGearGeometry;
    stats.triangles = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    // Both are the CLAMPED values: the rim is held outside the roots, the tip inside them.
    stats.tip = g.tipRadius.toFixed(4);
    stats.rim = g.rimRadius.toFixed(4);
    stats.toothDepth = (params.rootRadius - g.tipRadius).toFixed(4);
  };

  const rebuild = () => {
    ring.geometry.dispose();
    ring.geometry = new InternalGearGeometry(params);
    refresh();
  };
  refresh();
  // Framed ONCE — `frameObject` recomputes the camera distance, so calling it per rebuild steals the zoom.
  frameObject(handle, ring, { fit: 1.4 });

  const gui = new GUI();
  gui.title("Internal Gear");

  const opening = gui.addFolder("Opening");
  opening.add(params, "teeth", 8, 96, 1).name("Teeth").onChange(rebuild);
  // The INNER extreme — how far the teeth reach toward the centre. Clamped inside the roots.
  opening.add(params, "tipRadius", 0.1, 1.2, 0.01).name("Tip Radius").onChange(rebuild);
  // The OUTER extreme of the toothed opening. The gap between these two is the tooth depth.
  opening.add(params, "rootRadius", 0.2, 1.4, 0.01).name("Root Radius").onChange(rebuild);
  opening.open();

  const rim = gui.addFolder("Rim");
  // Clamped outside the roots — the rim is what the teeth hang from.
  rim.add(params, "rimRadius", 0.3, 2, 0.02).name("Rim Radius").onChange(rebuild);
  rim.add(params, "rimSides", 6, 96, 1).name("Rim Sides").onChange(rebuild);
  rim.add(params, "depth", 0.02, 1, 0.01).name("Depth").onChange(rebuild);
  rim.open();

  const tooth = gui.addFolder("Tooth");
  // The same period as the Gear — 0 points the tooth, Lean 1 kills the rising flank.
  tooth.add(params, "tipWidth", 0, 1, 0.01).name("Tip Width").onChange(rebuild);
  tooth.add(params, "valleyWidth", 0, 1, 0.01).name("Valley Width").onChange(rebuild);
  tooth.add(params, "lean", -1, 1, 0.01).name("Lean").onChange(rebuild);
  tooth.add(params, "rotation", -Math.PI, Math.PI, 0.01).name("Rotation").onChange(rebuild);

  // No rebuild — geometry is untouched by the colour.
  const material = gui.addFolder("Material");
  material.addColor(colors, "steel").name("Steel").onChange(() => steel.color.set(colors.steel));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "triangles").name("Triangles").listen().disable();
  readout.add(stats, "tip").name("Tip (clamped)").listen().disable();
  readout.add(stats, "rim").name("Rim (clamped)").listen().disable();
  readout.add(stats, "toothDepth").name("Tooth Depth").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    ring.geometry.dispose();
    steel.dispose();
    axes.dispose();
    dispose();
  };
}
