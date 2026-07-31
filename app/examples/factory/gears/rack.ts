import GUI from "lil-gui";
import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import { RackGeometry, type RackGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Rack",
  description:
    "The straight member of a rack and pinion. A RACK IS A GEAR OF INFINITE RADIUS — its teeth no longer " +
    "converge on a center, so they stand parallel and the period advances along a line instead of around a " +
    "circle. That is why the tooth profile is the Gear's unchanged, and why there is no polar arithmetic here " +
    "at all: Lean 1 gives a linear ratchet exactly as it gives a rotary one. PITCH IS AN OUTPUT, not an " +
    "input — length less the insets, divided by teeth — so teeth SUBDIVIDE a rack you have already sized " +
    "instead of extending it, exactly as they subdivide a gear's circumference. TIP HEIGHT AND VALLEY HEIGHT " +
    "ARE BOTH ABSOLUTE, measured from the underside, exactly as the circular gears measure both radii from " +
    "the center — so the pair reads like Outer and Inner Radius does there, and their order is not enforced: " +
    "put the valley above the tip and the teeth invert into channels. Both " +
    "ends carry HALF A VALLEY rather than starting flush " +
    "on a tooth, which is what lets racks TILE — butt two together and the seam is indistinguishable from any " +
    "interior valley, so a pinion rolls the length of a run as if it were one bar. Inset opens that seam, which " +
    "is why it defaults to 0.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [2.4, 1.6, 2.8] });
  const { scene, dispose } = handle;
  const axes = new AxesHelper(1.4);
  scene.add(axes);

  const params: Required<RackGeometryOptions> = {
    length: 3,
    teeth: 12,
    tipHeight: 0.38,
    valleyHeight: 0.2,
    inset: 0,
    tipWidth: 0.25,
    valleyWidth: 0.25,
    lean: 0,
    depth: 0.25,
  };

  const colors = { steel: "#9aa3ad" };
  const stats = { triangles: 0, pitch: "", pinion20: "" };

  const steel = new MeshStandardMaterial({
    color: new Color(colors.steel),
    metalness: 0.85,
    roughness: 0.32,
    flatShading: true,
  });

  const rack = new Mesh(new RackGeometry(params), steel);
  rack.castShadow = rack.receiveShadow = true;
  scene.add(rack);

  const refresh = () => {
    const g = rack.geometry as RackGeometry;
    stats.triangles = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    // Derived from the length, not asked for: adding teeth divides the same bar more finely.
    stats.pitch = g.pitch.toFixed(4);
    // The relationship that makes a rack and pinion mesh, shown rather than illustrated with a second object:
    // a pinion's circumferential pitch flattened out is the rack's linear pitch.
    stats.pinion20 = ((g.pitch * 20) / (Math.PI * 2)).toFixed(4);
  };

  const rebuild = () => {
    rack.geometry.dispose();
    rack.geometry = new RackGeometry(params);
    refresh();
    // The bar's origin is its left end, so Length walks its center away from the camera. Recenter without
    // re-fitting: this keeps it framed as it grows and leaves the viewer's zoom alone.
    frameObject(handle, rack, { dolly: false });
  };
  refresh();
  frameObject(handle, rack, { fit: 1.3 });

  const gui = new GUI();
  gui.title("Rack");

  // "Bar" is the WHOLE rack — its stock dimensions. The plain material below the roots is the "back", and it
  // is derived rather than dialled.
  const bar = gui.addFolder("Bar");
  bar.add(params, "length", 0.5, 8, 0.05).name("Length").onChange(rebuild);
  bar.add(params, "depth", 0.05, 1, 0.01).name("Depth").onChange(rebuild);
  bar.open();

  const teeth = gui.addFolder("Teeth");
  // The count subdivides the bar; pitch falls out of it below.
  teeth.add(params, "teeth", 1, 40, 1).name("Teeth").onChange(rebuild);
  // Where the toothed run starts and stops. It leaves the BAR untouched — still `length` long — and only
  // shortens the run the teeth divide, which is why it lives here and not under Bar. Defaults to 0: the period
  // split already leaves half a valley at each end, and any inset adds plain material on top of that, which is
  // what breaks tiling.
  teeth.add(params, "inset", 0, 0.5, 0.01).name("Inset").onChange(rebuild);
  // Both absolute from the underside, like the gear's two radii — and their order is free, so putting the
  // valley above the tip inverts the teeth into channels.
  teeth.add(params, "tipHeight", 0.04, 0.8, 0.01).name("Tip Height").onChange(rebuild);
  teeth.add(params, "valleyHeight", 0.04, 0.8, 0.01).name("Valley Height").onChange(rebuild);
  // Fractions of one period. The same split as the Gear — 0 points the tooth, Lean 1 makes it a linear ratchet.
  // Watch the Split readout: these two compete for the period, and the tip currently wins.
  teeth.add(params, "tipWidth", 0, 1, 0.01).name("Tip Width").onChange(rebuild);
  teeth.add(params, "valleyWidth", 0, 1, 0.01).name("Valley Width").onChange(rebuild);
  teeth.add(params, "lean", -1, 1, 0.01).name("Lean").onChange(rebuild);
  teeth.open();

  // No rebuild — geometry is untouched by the colour.
  const material = gui.addFolder("Material");
  material.addColor(colors, "steel").name("Steel").onChange(() => steel.color.set(colors.steel));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "triangles").name("Triangles").listen().disable();
  // An output of length and teeth, not a parameter.
  readout.add(stats, "pitch").name("Pitch").listen().disable();
  // Radius a 20-tooth pinion would need to mesh this pitch: pitch x teeth / 2pi.
  readout.add(stats, "pinion20").name("Pinion r (20T)").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    rack.geometry.dispose();
    steel.dispose();
    axes.dispose();
    dispose();
  };
}
