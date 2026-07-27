import GUI from "lil-gui";
import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import { BevelGearGeometry, type BevelGearGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Bevel Gear",
  description:
    "Teeth cut on a PITCH CONE, for shafts whose axes intersect — the wheel a gearbox or differential is built " +
    "from. Because the teeth taper toward the cone's apex, this cannot be an extrusion like the Gear or the " +
    "Crossed Wheel: it is a LOFT between the full profile at the back face and the same profile uniformly scaled at the " +
    "front, which puts every tooth flank on a plane through the apex by construction. A 45° pair of equal " +
    "wheels meshes at a right angle 1:1 — a miter gear. Not a worm gear, which is a helical screw driving a " +
    "wheel: thread-based rather than conical. Apex Z is where the cone converges: a real pair meshes only when " +
    "both wheels share that apex, which is a placement problem for an assembly rather than a geometry.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [1.9, 1.5, 2.3] });
  const { scene, dispose } = handle;

  const axes = new AxesHelper(1.4);
  scene.add(axes);

  const params: Required<BevelGearGeometryOptions> = {
    teeth: 16,
    innerRadius: 0.78,
    outerRadius: 1,
    tipWidth: 0.3,
    valleyWidth: 0.3,
    lean: 0,
    pitchAngle: Math.PI / 4,
    faceWidth: 0.35,
    holeSides: 12,
    holeRadius: 0.22,
    rotation: 0,
    holeRotation: 0,
  };

  const colors = { steel: "#9aa3ad" };
  const stats = { triangles: 0, frontScale: "", frontZ: "", apexZ: "", bore: "" };

  const steel = new MeshStandardMaterial({
    color: new Color(colors.steel),
    metalness: 0.8,
    roughness: 0.4,
    flatShading: true,
  });

  const gear = new Mesh(new BevelGearGeometry(params), steel);
  gear.castShadow = gear.receiveShadow = true;
  scene.add(gear);

  const refresh = () => {
    const g = gear.geometry as BevelGearGeometry;
    stats.triangles = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    stats.frontScale = g.frontScale.toFixed(4);
    stats.frontZ = g.frontZ.toFixed(4);
    stats.apexZ = g.apexZ.toFixed(4);
    stats.bore = g.holeRadius.toFixed(4);
  };

  const rebuild = () => {
    gear.geometry.dispose();
    gear.geometry = new BevelGearGeometry(params);
    refresh();
  };
  refresh();
  // Framed ONCE — `frameObject` recomputes the camera distance, so calling it per rebuild steals the zoom.
  frameObject(handle, gear, { fit: 1.4 });

  const gui = new GUI();
  gui.title("Bevel Gear");

  const cone = gui.addFolder("Cone");
  // 45° is the miter case. Shallow approaches a flat crown wheel; steep approaches a spur gear.
  cone.add(params, "pitchAngle", 0.1, Math.PI / 2 - 0.05, 0.01).name("Pitch Angle").onChange(rebuild);
  // Measured along the cone ELEMENT, not the axis — and clamped short of the apex.
  cone.add(params, "faceWidth", 0.05, 1.2, 0.01).name("Face Width").onChange(rebuild);
  cone.open();

  const wheel = gui.addFolder("Wheel");
  wheel.add(params, "teeth", 6, 48, 1).name("Teeth").onChange(rebuild);
  wheel.add(params, "outerRadius", 0.4, 2, 0.02).name("Outer Radius").onChange(rebuild);
  wheel.add(params, "innerRadius", 0.3, 2, 0.02).name("Inner Radius").onChange(rebuild);
  wheel.open();

  const tooth = gui.addFolder("Tooth");
  // Inherited from the Gear — the tooth profile is the same, only lofted instead of extruded.
  tooth.add(params, "tipWidth", 0, 1, 0.01).name("Tip Width").onChange(rebuild);
  tooth.add(params, "valleyWidth", 0, 1, 0.01).name("Valley Width").onChange(rebuild);
  tooth.add(params, "lean", -1, 1, 0.01).name("Lean").onChange(rebuild);

  const bore = gui.addFolder("Bore");
  bore.add(params, "holeRadius", 0, 0.7, 0.01).name("Hole Radius").onChange(rebuild);
  bore.add(params, "holeSides", 3, 24, 1).name("Hole Sides").onChange(rebuild);
  // Only visible on a low side count: at 4 the bore rests as a diamond, and PI/4 squares it up.
  bore.add(params, "holeRotation", 0, Math.PI / 2, 0.01).name("Hole Rotation").onChange(rebuild);

  // No rebuild — geometry is untouched by the colour.
  const material = gui.addFolder("Material");
  material.addColor(colors, "steel").name("Steel").onChange(() => steel.color.set(colors.steel));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "triangles").name("Triangles").listen().disable();
  // How far the teeth converge — 1 would be no taper at all.
  readout.add(stats, "frontScale").name("Front Scale").listen().disable();
  readout.add(stats, "frontZ").name("Front Z").listen().disable();
  readout.add(stats, "apexZ").name("Apex Z").listen().disable();
  readout.add(stats, "bore").name("Bore (clamped)").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    gear.geometry.dispose();
    steel.dispose();
    axes.dispose();
    dispose();
  };
}
