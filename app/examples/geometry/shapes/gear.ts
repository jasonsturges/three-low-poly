import GUI from "lil-gui";
import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import { GearGeometry, type GearGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Gear",
  description:
    "One tooth period runs tip, falling flank, valley, rising flank. Splitting that period into four EQUAL " +
    "quarters is what makes a gear's teeth permanently blunt — so here the two flats are sized independently " +
    "and the flanks take whatever is left. Tip Width at 0 brings the tooth to a point; Valley Width at 0 " +
    "sharpens the trough. Lean at 1 kills the rising flank and drops the trailing face radially, turning the " +
    "same profile into a ratchet wheel for an escapement. The bore is clamped against the OUTLINE, not the " +
    "valley radius — a flank chord passes nearer the centre than either of its endpoints.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [1.4, 1.1, 2.2] });
  const { scene, dispose } = handle;

  // The gear is centred on its own thickness, so the axes sit on the plane it turns in.
  const axes = new AxesHelper(1.4);
  scene.add(axes);

  const params: Required<GearGeometryOptions> = {
    teeth: 12,
    innerRadius: 0.62,
    outerRadius: 1,
    tipWidth: 0.25,
    valleyWidth: 0.25,
    lean: 0,
    holeSides: 5,
    holeRadius: 0.25,
    rotation: 0,
    depth: 0.25,
  };

  const colors = { metal: "#b9a06a" };
  const stats = { triangles: 0, bore: "", zExtent: "" };

  const metal = new MeshStandardMaterial({
    color: new Color(colors.metal),
    metalness: 0.8,
    roughness: 0.35,
    flatShading: true,
  });

  const gear = new Mesh(new GearGeometry(params), metal);
  gear.castShadow = gear.receiveShadow = true;
  scene.add(gear);

  let boreControl: { updateDisplay(): void } | undefined;

  const refresh = () => {
    const geometry = gear.geometry as GearGeometry;
    stats.triangles = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;
    stats.bore = geometry.holeRadius.toFixed(4);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    stats.zExtent = `${box.min.z.toFixed(3)} … ${box.max.z.toFixed(3)}`;
  };

  const rebuild = () => {
    gear.geometry.dispose();
    gear.geometry = new GearGeometry(params);
    // The bore clamps against the outline, and the limit tightens as teeth get sparse. Show the radius that
    // was actually used rather than the one we asked for.
    const used = (gear.geometry as GearGeometry).holeRadius;
    if (params.holeRadius > used) {
      params.holeRadius = used;
      boreControl?.updateDisplay();
    }
    refresh();
  };
  refresh();
  // Framed ONCE, deliberately not inside `refresh`. `frameObject` recomputes the camera DISTANCE
  // from the object's bounding sphere, so calling it on every rebuild snaps the zoom back and throws
  // away whatever the viewer had set.
  frameObject(handle, gear, { fit: 1.4 });

  const gui = new GUI();
  gui.title("Gear");

  const wheel = gui.addFolder("Wheel");
  wheel.add(params, "teeth", 2, 48, 1).name("Teeth").onChange(rebuild);
  wheel.add(params, "innerRadius", 0.1, 2, 0.02).name("Valley Radius").onChange(rebuild);
  wheel.add(params, "outerRadius", 0.1, 3, 0.02).name("Tip Radius").onChange(rebuild);
  wheel.add(params, "depth", 0.02, 1, 0.01).name("Depth").onChange(rebuild);
  wheel.add(params, "rotation", -Math.PI, Math.PI, 0.01).name("Rotation").onChange(rebuild);
  wheel.open();

  const tooth = gui.addFolder("Tooth");
  // 0 brings the tooth to a point — the thing the old four-equal-quarters split could never do.
  tooth.add(params, "tipWidth", 0, 1, 0.01).name("Tip Width").onChange(rebuild);
  tooth.add(params, "valleyWidth", 0, 1, 0.01).name("Valley Width").onChange(rebuild);
  // 1 kills the rising flank entirely: a ratchet, not a gear.
  tooth.add(params, "lean", -1, 1, 0.01).name("Lean").onChange(rebuild);
  tooth.open();

  const bore = gui.addFolder("Bore");
  boreControl = bore.add(params, "holeRadius", 0, 1.5, 0.01).name("Radius").onChange(rebuild);
  bore.add(params, "holeSides", 3, 24, 1).name("Sides").onChange(rebuild);
  bore.open();

  // No rebuild — geometry is untouched by the colour.
  const material = gui.addFolder("Material");
  material.addColor(colors, "metal").name("Metal").onChange(() => metal.color.set(colors.metal));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "triangles").name("Triangles").listen().disable();
  readout.add(stats, "bore").name("Bore (clamped)").listen().disable();
  // Symmetric about 0 — the wheel is centred on its thickness.
  readout.add(stats, "zExtent").name("Z Extent").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    gear.geometry.dispose();
    metal.dispose();
    axes.dispose();
    dispose();
  };
}
