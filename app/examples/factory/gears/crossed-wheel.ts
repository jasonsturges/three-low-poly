import GUI from "lil-gui";
import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import { CrossedWheelGeometry, type CrossedWheelGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Crossed Wheel",
  description:
    "A CROSSED-OUT WHEEL — the brass wheel from a clock or watch train. In horology the spokes are " +
    "'crossings' and cutting them is 'crossing out', done to shed weight and brass so the train has less " +
    "inertia to drive; a wheel is named by the count, as in a five-crossing wheel. Where the Gear is a solid " +
    "disc with a bore, this removes the WEB between hub and rim. Crossings are constant WIDTH rather than " +
    "constant angle, so a spoke reads as a straight bar instead of a wedge fattening toward the rim. Every " +
    "tooth option is inherited, so a crossed-out escapement wheel is crossings 5, Tip Width 0, Lean 1.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [1.3, 1.0, 2.1] });
  const { scene, dispose } = handle;

  // Centered on its own thickness, so the axes sit on the plane the wheel turns in.
  const axes = new AxesHelper(1.3);
  scene.add(axes);

  const params: Required<CrossedWheelGeometryOptions> = {
    teeth: 60,
    innerRadius: 0.88,
    outerRadius: 1,
    tipWidth: 0.35,
    valleyWidth: 0.35,
    lean: 0,
    crossings: 5,
    crossingWidth: 0.07,
    hubRadius: 0.2,
    rimWidth: 0.09,
    crossingSegments: 6,
    holeSides: 16,
    holeRadius: 0.075,
    rotation: 0,
    holeRotation: 0,
    depth: 0.06,
  };

  const colors = { brass: "#c9a227" };
  const stats = { triangles: 0, crossings: 0, hub: "", rimInner: "", crossW: "", bore: "" };

  const brass = new MeshStandardMaterial({
    color: new Color(colors.brass),
    metalness: 0.85,
    roughness: 0.35,
    flatShading: true,
  });

  const wheel = new Mesh(new CrossedWheelGeometry(params), brass);
  wheel.castShadow = wheel.receiveShadow = true;
  scene.add(wheel);

  const refresh = () => {
    const g = wheel.geometry as CrossedWheelGeometry;
    stats.triangles = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    // Every one of these is the CLAMPED value, not the requested one — the clamps are what stop the teeth
    // coming away from the rim or the bore swallowing the hub.
    stats.crossings = g.crossings;
    stats.hub = g.hubRadius.toFixed(4);
    stats.rimInner = g.rimInnerRadius.toFixed(4);
    stats.crossW = g.crossingWidth.toFixed(4);
    stats.bore = g.holeRadius.toFixed(4);
  };

  const rebuild = () => {
    wheel.geometry.dispose();
    wheel.geometry = new CrossedWheelGeometry(params);
    refresh();
  };
  refresh();
  // Framed ONCE, deliberately not inside `refresh`. `frameObject` recomputes the camera DISTANCE
  // from the object's bounding sphere, so calling it on every rebuild snaps the zoom back and throws
  // away whatever the viewer had set.
  frameObject(handle, wheel, { fit: 1.35 });

  const gui = new GUI();
  gui.title("Crossed Wheel");

  const wheelFolder = gui.addFolder("Wheel");
  wheelFolder.add(params, "teeth", 6, 120, 1).name("Teeth").onChange(rebuild);
  wheelFolder.add(params, "outerRadius", 0.3, 2, 0.02).name("Outer Radius").onChange(rebuild);
  wheelFolder.add(params, "innerRadius", 0.2, 2, 0.02).name("Inner Radius").onChange(rebuild);
  wheelFolder.add(params, "depth", 0.01, 0.4, 0.01).name("Depth").onChange(rebuild);
  wheelFolder.open();

  const crossing = gui.addFolder("Crossings");
  // Below 2 there are no gaps to define, so the web stays solid — which is just the Gear.
  crossing.add(params, "crossings", 0, 12, 1).name("Crossings").onChange(rebuild);
  crossing.add(params, "crossingWidth", 0.01, 0.4, 0.005).name("Crossing Width").onChange(rebuild);
  crossing.add(params, "hubRadius", 0.05, 0.8, 0.01).name("Hub Radius").onChange(rebuild);
  // Drive this to 0 and the cut-outs would reach the valley floor — the clamp stops the teeth detaching.
  crossing.add(params, "rimWidth", 0, 0.6, 0.01).name("Rim Width").onChange(rebuild);
  crossing.add(params, "crossingSegments", 1, 16, 1).name("Crossing Segments").onChange(rebuild);
  crossing.open();

  const tooth = gui.addFolder("Tooth");
  // Inherited from the Gear — 0 points the tooth, Lean 1 makes it a ratchet.
  tooth.add(params, "tipWidth", 0, 1, 0.01).name("Tip Width").onChange(rebuild);
  tooth.add(params, "valleyWidth", 0, 1, 0.01).name("Valley Width").onChange(rebuild);
  tooth.add(params, "lean", -1, 1, 0.01).name("Lean").onChange(rebuild);

  const bore = gui.addFolder("Bore");
  bore.add(params, "holeRadius", 0, 0.6, 0.005).name("Hole Radius").onChange(rebuild);
  bore.add(params, "holeSides", 3, 24, 1).name("Hole Sides").onChange(rebuild);
  // Only visible on a low side count: at 4 the bore rests as a diamond, and PI/4 squares it up.
  bore.add(params, "holeRotation", 0, Math.PI / 2, 0.01).name("Hole Rotation").onChange(rebuild);

  // No rebuild — geometry is untouched by the colour.
  const material = gui.addFolder("Material");
  material.addColor(colors, "brass").name("Brass").onChange(() => brass.color.set(colors.brass));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "triangles").name("Triangles").listen().disable();
  readout.add(stats, "crossings").name("Crossings cut").listen().disable();
  readout.add(stats, "hub").name("Hub (clamped)").listen().disable();
  readout.add(stats, "rimInner").name("Rim Inner").listen().disable();
  readout.add(stats, "crossW").name("Width (clamped)").listen().disable();
  readout.add(stats, "bore").name("Bore (clamped)").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    wheel.geometry.dispose();
    brass.dispose();
    axes.dispose();
    dispose();
  };
}
