import GUI from "lil-gui";
import {
  BufferGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import {
  type ArchStyle,
  DiamondLatticeGeometry,
  type DiamondLatticeGeometryOptions,
  GroundGrid,
  openingOutline,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Diamond Lattice",
  description:
    "The leading of a leaded light, on its own — every came spans the opening and is cut into the boundary " +
    "at both ends, so nothing pokes out through the frame. There is no separate rectangular version: " +
    "`arch: \"square\"` is a flat head, so the mullioned rectangle and the gothic light are one geometry. " +
    "Baked to a single BufferGeometry — one draw call for the whole lattice, however many cames. Phase " +
    "slides the grid across the opening, which is what decides whether a quarry sits on the crown or a " +
    "came runs up it.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x8b98a6,
    cameraPosition: [0.9, 1.6, 2.6],
  });

  controls.target.set(0, 0.9, 0);
  controls.update();

  const floor = new GroundGrid({ size: 6, planeColor: 0x3f4954, gridColor: 0x4c5866 });
  scene.add(floor);

  // The opening the cames are cut to, traced. Everything in the lattice is decided by this one line, so
  // seeing it is what turns "the ends look right" into "the ends ARE the boundary".
  const boundaryLine = new LineBasicMaterial({ color: 0xffd166 });

  // Flat shading, because a came's cut ends are facets — that is the whole construction, and smoothing
  // would average exactly the evidence away.
  const lead = new MeshStandardMaterial({
    color: 0x8d949e,
    roughness: 0.5,
    metalness: 0.4,
    flatShading: true,
    side: DoubleSide,
  });

  const params = {
    width: 1.24,
    height: 1.15,
    arch: "pointed" as ArchStyle,
    archHeight: 0.78,
    angle: 45,
    spacing: 0.19,
    phase: 0,
    cameWidth: 0.022,
    cameDepth: 0.03,
    cameSides: 4,
    curveSegments: 20,
    showOutline: true,
    readout: "",
  };

  const stage = new Group();
  scene.add(stage);

  const options = (): DiamondLatticeGeometryOptions => ({
    opening: {
      width: params.width,
      height: params.height,
      arch: params.arch,
      archHeight: params.archHeight,
    },
    angle: params.angle,
    spacing: params.spacing,
    phase: params.phase,
    cameWidth: params.cameWidth,
    cameDepth: params.cameDepth,
    cameSides: params.cameSides,
    curveSegments: params.curveSegments,
  });

  let lattice = new Mesh(new DiamondLatticeGeometry(options()), lead);
  lattice.castShadow = true;
  stage.add(lattice);

  let outline: Line | null = null;
  const traceOpening = () => {
    if (outline) {
      outline.geometry.dispose();
      stage.remove(outline);
      outline = null;
    }
    if (!params.showOutline) return;
    // The SAME call the geometry makes, normalized to the origin the same way — so if these ever
    // disagreed, this line would be the thing that showed it.
    const points = openingOutline({ ...options().opening, x: 0, y: 0 })
      .getPoints(Math.max(2, Math.round(params.curveSegments)))
      .map((p) => new Vector3(p.x, p.y, 0));
    outline = new Line(new BufferGeometry().setFromPoints(points), boundaryLine);
    stage.add(outline);
  };
  traceOpening();

  const report = () => {
    const geometry = lattice.geometry as DiamondLatticeGeometry;
    params.readout = `${geometry.cameCount} cames · ${geometry.attributes.position?.count ?? 0} verts · 1 geometry`;
  };
  report();

  const rebuild = () => {
    lattice.geometry.dispose();
    lattice.geometry = new DiamondLatticeGeometry(options());
    traceOpening();
    report();
  };

  const gui = new GUI();
  gui.title("Diamond Lattice");

  const opening = gui.addFolder("Opening");
  // `square` is the RECTANGULAR window, and it needs no other code path.
  opening
    .add(params, "arch", [
      "square",
      "segmental",
      "semicircle",
      "horseshoe",
      "elliptical",
      "pointed",
      "ogee",
    ])
    .name("Arch")
    .onChange(rebuild);
  opening.add(params, "width", 0.5, 2, 0.02).name("Width").onChange(rebuild);
  opening.add(params, "height", 0.3, 2, 0.02).name("Springing").onChange(rebuild);
  opening.add(params, "archHeight", 0.1, 1.4, 0.02).name("Rise").onChange(rebuild);
  // Also the ceiling on the came ends: they can never be finer than the boundary they die into.
  opening.add(params, "curveSegments", 3, 48, 1).name("Curve Segments").onChange(rebuild);
  opening.open();

  const leading = gui.addFolder("Leading");
  leading.add(params, "angle", 15, 75, 1).name("Angle").onChange(rebuild);
  leading.add(params, "spacing", 0.06, 0.5, 0.005).name("Spacing").onChange(rebuild);
  // Slides the grid across the opening — a quarry on the crown, or a came running up it.
  leading.add(params, "phase", -0.25, 0.25, 0.005).name("Phase").onChange(rebuild);
  leading.add(params, "cameWidth", 0.008, 0.06, 0.001).name("Came Width").onChange(rebuild);
  // Free to vary: nothing in the cutting reads a point's depth, so a rectangular came costs nothing.
  // Real lead is deeper than it is wide.
  leading.add(params, "cameDepth", 0.008, 0.1, 0.001).name("Came Depth").onChange(rebuild);
  leading.add(params, "cameSides", 3, 12, 1).name("Came Sides").onChange(rebuild);
  leading.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showOutline").name("Opening Outline").onChange(traceOpening);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Geometry").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    lattice.geometry.dispose();
    outline?.geometry.dispose();
    boundaryLine.dispose();
    lead.dispose();
    floor.dispose();
    dispose();
  };
}
