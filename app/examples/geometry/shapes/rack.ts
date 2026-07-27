import GUI from "lil-gui";
import { Color, Mesh, MeshStandardMaterial } from "three";
import { GroundGrid, RackGeometry, type RackGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Rack",
  description:
    "The straight member of a rack and pinion. A RACK IS A GEAR OF INFINITE RADIUS — its teeth no longer " +
    "converge on a centre, so they stand parallel and the period advances along a line instead of around a " +
    "circle. That is why the tooth profile is the Gear's unchanged, and why there is no polar arithmetic here " +
    "at all: Lean 1 gives a linear ratchet exactly as it gives a rotary one. LENGTH IS AN OUTPUT, not an " +
    "input — end margin twice plus teeth times pitch — so every tooth is whole. Asking for a length instead " +
    "would leave a fractional tooth at one end. The readout shows the pinion radius this pitch would mesh.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x8fa6b8, cameraPosition: [2.4, 1.6, 2.8] });
  const { scene, dispose } = handle;

  // Rests on y=0, so it gets a ground.
  const ground = new GroundGrid({ size: 8, divisions: 16 });
  scene.add(ground);

  const params: Required<RackGeometryOptions> = {
    teeth: 12,
    pitch: 0.25,
    toothHeight: 0.18,
    baseHeight: 0.2,
    endMargin: 0.06,
    tipWidth: 0.25,
    valleyWidth: 0.25,
    lean: 0,
    depth: 0.25,
  };

  const colors = { steel: "#9aa3ad" };
  const stats = { triangles: 0, length: "", tipY: "", pinion20: "" };

  const steel = new MeshStandardMaterial({
    color: new Color(colors.steel),
    metalness: 0.7,
    roughness: 0.42,
    flatShading: true,
  });

  const rack = new Mesh(new RackGeometry(params), steel);
  rack.castShadow = rack.receiveShadow = true;
  scene.add(rack);

  const refresh = () => {
    const g = rack.geometry as RackGeometry;
    stats.triangles = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    stats.length = g.length.toFixed(4);
    stats.tipY = g.tipY.toFixed(4);
    // The relationship that makes a rack and pinion mesh, shown rather than illustrated with a second object:
    // a pinion's circumferential pitch flattened out is the rack's linear pitch.
    stats.pinion20 = ((params.pitch * 20) / (Math.PI * 2)).toFixed(4);
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
  // Teeth and pitch decide the length; the length is never asked for directly.
  run.add(params, "teeth", 1, 40, 1).name("Teeth").onChange(rebuild);
  run.add(params, "pitch", 0.08, 0.8, 0.01).name("Pitch").onChange(rebuild);
  run.add(params, "endMargin", 0, 0.5, 0.01).name("End Margin").onChange(rebuild);
  run.open();

  const bar = gui.addFolder("Bar");
  bar.add(params, "toothHeight", 0.04, 0.6, 0.01).name("Tooth Height").onChange(rebuild);
  bar.add(params, "baseHeight", 0.04, 0.8, 0.01).name("Base Height").onChange(rebuild);
  bar.add(params, "depth", 0.05, 1, 0.01).name("Depth").onChange(rebuild);
  bar.open();

  const tooth = gui.addFolder("Tooth");
  // The same period as the Gear — 0 points the tooth, Lean 1 makes it a linear ratchet.
  tooth.add(params, "tipWidth", 0, 1, 0.01).name("Tip Width").onChange(rebuild);
  tooth.add(params, "valleyWidth", 0, 1, 0.01).name("Root Width").onChange(rebuild);
  tooth.add(params, "lean", -1, 1, 0.01).name("Lean").onChange(rebuild);
  tooth.open();

  // No rebuild — geometry is untouched by the colour.
  const material = gui.addFolder("Material");
  material.addColor(colors, "steel").name("Steel").onChange(() => steel.color.set(colors.steel));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "triangles").name("Triangles").listen().disable();
  // An output of teeth x pitch, not a parameter.
  readout.add(stats, "length").name("Length").listen().disable();
  readout.add(stats, "tipY").name("Height").listen().disable();
  // Radius a 20-tooth pinion would need to mesh this pitch: pitch x teeth / 2pi.
  readout.add(stats, "pinion20").name("Pinion r (20T)").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    rack.geometry.dispose();
    steel.dispose();
    ground.dispose();
    dispose();
  };
}
