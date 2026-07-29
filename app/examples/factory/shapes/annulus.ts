import GUI from "lil-gui";
import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import { AnnulusGeometry, type AnnulusGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Annulus",
  description:
    "A flat ring with a bore, square in section — a washer, a pipe collar, a well rim, a coin blank. Built as " +
    "a SURFACE OF REVOLUTION: the four sides are four points of a rectangular profile spun around +Y, which " +
    "is why it costs so little. At 8 sides it is 64 triangles across 45 shared vertices; the same ring " +
    "extruded from a 2D shape with a hole runs to 384 unshared vertices for no visual gain. Sides is the " +
    "low-poly dial — 24 reads smooth, 8 is faceted, and 4 is a genuine square washer, all one construction. " +
    "It rests on y=0 rather than straddling it, which the Base Y readout holds at zero through every change.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x8fa6b8, cameraPosition: [2.2, 1.8, 2.6] });
  const { scene, dispose } = handle;

  // Unlike the gears, this rests ON the plane rather than straddling it — so the axes mark the origin the
  // ring sits on, not one it is centred through. That is what Base Y reads out.
  const axes = new AxesHelper(1.4);
  scene.add(axes);

  const params: Required<AnnulusGeometryOptions> = {
    radius: 1,
    holeRadius: 0.45,
    depth: 0.15,
    sides: 24,
    rotation: 0,
  };

  const colors = { iron: "#8d949e" };
  const stats = { triangles: 0, vertices: 0, bore: "", baseY: "" };

  const iron = new MeshStandardMaterial({
    color: new Color(colors.iron),
    metalness: 0.4,
    roughness: 0.5,
    // Flat shading is what keeps the profile's corners hard — the lathe shares those vertices, so under
    // smooth shading the edges would soften.
    flatShading: true,
  });

  const washer = new Mesh(new AnnulusGeometry(params), iron);
  washer.castShadow = washer.receiveShadow = true;
  scene.add(washer);

  const refresh = () => {
    const geometry = washer.geometry as AnnulusGeometry;
    stats.triangles = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;
    stats.vertices = geometry.attributes.position.count;
    // The clamped bore, not the requested one — push Bore past Radius and watch it hold.
    stats.bore = geometry.holeRadius.toFixed(4);
    geometry.computeBoundingBox();
    stats.baseY = geometry.boundingBox!.min.y.toExponential(2);
  };

  const rebuild = () => {
    washer.geometry.dispose();
    washer.geometry = new AnnulusGeometry(params);
    refresh();
    // Recentre without re-fitting — it rests on y=0, so Depth lifts its centre. `dolly: false` is what
    // keeps the viewer's zoom from snapping back on every change.
    frameObject(handle, washer, { dolly: false });
  };
  refresh();
  frameObject(handle, washer, { fit: 1.5 });

  const gui = new GUI();
  gui.title("Annulus");

  const size = gui.addFolder("Size");
  size.add(params, "radius", 0.2, 2, 0.05).name("Radius").onChange(rebuild);
  // Clamped inside Radius — drive it past and the wall holds rather than inverting.
  size.add(params, "holeRadius", 0, 2, 0.05).name("Hole Radius").onChange(rebuild);
  size.add(params, "depth", 0.02, 1, 0.01).name("Depth").onChange(rebuild);
  size.open();

  const mesh = gui.addFolder("Mesh");
  // 4 is a square washer, 6 hexagonal, 24 reads round. Same construction at every value.
  mesh.add(params, "sides", 3, 48, 1).name("Sides").onChange(rebuild);
  // Only visible on a low side count — it spins the facets, not a round ring.
  mesh.add(params, "rotation", 0, Math.PI / 2, 0.01).name("Rotation").onChange(rebuild);
  mesh.open();

  // No rebuild — geometry is untouched by the colour.
  const material = gui.addFolder("Material");
  material.addColor(colors, "iron").name("Iron").onChange(() => iron.color.set(colors.iron));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "triangles").name("Triangles").listen().disable();
  readout.add(stats, "vertices").name("Vertices").listen().disable();
  readout.add(stats, "bore").name("Bore (clamped)").listen().disable();
  // Should read ~0 at every setting — it rests on the plane rather than straddling it.
  readout.add(stats, "baseY").name("Base Y").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    washer.geometry.dispose();
    iron.dispose();
    axes.dispose();
    dispose();
  };
}
