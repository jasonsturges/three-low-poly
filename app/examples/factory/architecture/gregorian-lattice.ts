import GUI from "lil-gui";
import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { type ArchStyle, GregorianLatticeGeometry, GroundGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Gregorian Lattice",
  description:
    "Glazing bars on their own — upright MULLIONS and level TRANSOMS dividing an opening into rectangular " +
    "lights. The sibling of the diamond lattice, and the same construction underneath: a lattice type is " +
    "only ever a choice of angles, so this is two bar families at 90° and 0°. No miters — mullion crosses " +
    "transom and they interpenetrate, which is what real glazing bars do. The ends are still cut to the " +
    "boundary though, which does nothing in a square opening (every end is already square) and everything " +
    "under an arch. Baked to a single BufferGeometry.",
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

  const painted = new MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.75,
    metalness: 0.05,
    flatShading: true,
    side: DoubleSide,
  });

  const params = {
    arch: "semicircle" as ArchStyle,
    width: 1.2,
    springing: 1.5,
    archHeight: 0.6,
    mullionSpacing: 0.3,
    transomSpacing: 0.34,
    mullionPhase: 0.15,
    transomPhase: 0,
    barWidth: 0.03,
    barDepth: 0.03,
    barSides: 4,
    curveSegments: 20,
    readout: "",
  };

  const options = () => ({
    opening: {
      width: params.width,
      height: params.springing,
      arch: params.arch,
      archHeight: params.archHeight,
    },
    mullionSpacing: params.mullionSpacing,
    transomSpacing: params.transomSpacing,
    mullionPhase: params.mullionPhase,
    transomPhase: params.transomPhase,
    barWidth: params.barWidth,
    barDepth: params.barDepth,
    barSides: params.barSides,
    curveSegments: params.curveSegments,
  });

  let lattice = new Mesh(new GregorianLatticeGeometry(options()), painted);
  lattice.castShadow = true;
  scene.add(lattice);

  const report = () => {
    const g = lattice.geometry as GregorianLatticeGeometry;
    params.readout = `${g.barCount} bars · ${g.attributes.position?.count ?? 0} verts · 1 geometry`;
  };
  report();

  const rebuild = () => {
    lattice.geometry.dispose();
    lattice.geometry = new GregorianLatticeGeometry(options());
    report();
  };

  const gui = new GUI();
  gui.title("Gregorian Lattice");

  const opening = gui.addFolder("Opening");
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
  opening.add(params, "width", 0.4, 2, 0.02).name("Width").onChange(rebuild);
  opening.add(params, "springing", 0.3, 2.2, 0.02).name("Springing").onChange(rebuild);
  opening.add(params, "archHeight", 0.1, 1.4, 0.02).name("Rise").onChange(rebuild);
  opening.add(params, "curveSegments", 3, 48, 1).name("Curve Segments").onChange(rebuild);
  opening.open();

  const bars = gui.addFolder("Bars");
  bars.add(params, "mullionSpacing", 0.06, 0.6, 0.005).name("Mullion Spacing").onChange(rebuild);
  bars.add(params, "transomSpacing", 0.06, 0.6, 0.005).name("Transom Spacing").onChange(rebuild);
  // Phase decides whether the centerline carries a BAR or a LIGHT. Half a spacing swaps them.
  bars.add(params, "mullionPhase", -0.3, 0.3, 0.005).name("Mullion Phase").onChange(rebuild);
  // At 0 a transom lands on the sill line and is dropped — its section straddles the boundary, and the
  // frame occupies that position anyway.
  bars.add(params, "transomPhase", -0.3, 0.3, 0.005).name("Transom Phase").onChange(rebuild);
  bars.add(params, "barWidth", 0.008, 0.08, 0.001).name("Bar Width").onChange(rebuild);
  bars.add(params, "barDepth", 0.008, 0.12, 0.001).name("Bar Depth").onChange(rebuild);
  bars.add(params, "barSides", 3, 12, 1).name("Bar Sides").onChange(rebuild);
  bars.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Geometry").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    lattice.geometry.dispose();
    painted.dispose();
    floor.dispose();
    dispose();
  };
}
