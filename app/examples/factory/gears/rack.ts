import GUI from "lil-gui";
import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import { RackGeometry, type RackGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Rack",
  description:
    "The straight member of a rack and pinion. A RACK IS A GEAR OF INFINITE RADIUS — its teeth no longer " +
    "converge on a centre, so they stand parallel and the period advances along a line instead of around a " +
    "circle. That is why the tooth profile is the Gear's unchanged, and why there is no polar arithmetic here " +
    "at all: Lean 1 gives a linear ratchet exactly as it gives a rotary one. PITCH IS AN OUTPUT, not an " +
    "input — length less the insets, divided by teeth — so teeth SUBDIVIDE a bar you have already sized " +
    "instead of extending it, exactly as they subdivide a gear's circumference. Root and Tip Height are " +
    "absolute from the ground, like the gear's two radii: put the tip below the root and the teeth cut " +
    "channels into the bar instead of standing on it. Both ends carry HALF A VALLEY rather than starting flush " +
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
    rootHeight: 0.2,
    tipHeight: 0.38,
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
  };
  refresh();
  // Framed ONCE — `frameObject` recomputes the camera distance, so calling it per rebuild steals the zoom.
  frameObject(handle, rack, { fit: 1.3 });

  const gui = new GUI();
  gui.title("Rack");

  const run = gui.addFolder("Run");
  // Length is the size; teeth divide it. Neither one is pitch — that falls out below.
  run.add(params, "length", 0.5, 8, 0.05).name("Length").onChange(rebuild);
  run.add(params, "teeth", 1, 40, 1).name("Teeth").onChange(rebuild);
  // Carved out of the length, never added to it: the bar stays exactly as long as it was. Defaults to 0 because
  // any nonzero inset destroys tiling — the ends already carry half a valley each so racks butt together.
  run.add(params, "inset", 0, 0.5, 0.01).name("Inset").onChange(rebuild);
  run.open();

  const bar = gui.addFolder("Bar");
  // Both absolute from y=0, like the gear's inner and outer radii — so they can be inverted.
  bar.add(params, "rootHeight", 0.04, 0.8, 0.01).name("Root Height").onChange(rebuild);
  bar.add(params, "tipHeight", 0.04, 0.8, 0.01).name("Tip Height").onChange(rebuild);
  bar.add(params, "depth", 0.05, 1, 0.01).name("Depth").onChange(rebuild);
  bar.open();

  const tooth = gui.addFolder("Tooth");
  // The same period as the Gear — 0 points the tooth, Lean 1 makes it a linear ratchet.
  tooth.add(params, "tipWidth", 0, 1, 0.01).name("Tip Width").onChange(rebuild);
  tooth.add(params, "valleyWidth", 0, 1, 0.01).name("Valley Width").onChange(rebuild);
  tooth.add(params, "lean", -1, 1, 0.01).name("Lean").onChange(rebuild);
  tooth.open();

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
