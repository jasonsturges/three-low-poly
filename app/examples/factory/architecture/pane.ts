import GUI from "lil-gui";
import { DoubleSide, Mesh, MeshPhysicalMaterial } from "three";
import { type ArchStyle, GroundGrid, PaneGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Pane",
  description:
    "The glass: a flat pane filling an opening, and the third of the trio that share one `opening` " +
    "description — a wall is punched with it, `WindowFrameGeometry` rings it, `DiamondLatticeGeometry` " +
    "leads it, and this glazes it. A PLANE, not a solid: glass at this scale is a surface, and giving it " +
    "thickness doubles its triangles for nothing a low-poly scene can see. Rebate is how far it runs PAST " +
    "the opening into the frame's groove, because a real pane is oversize rather than undersize — its " +
    "edge is meant to be hidden. Follows any arch, including `square`.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x6f7c8a,
    cameraPosition: [0.9, 1.5, 2.6],
  });

  controls.target.set(0, 0.9, 0);
  controls.update();

  const floor = new GroundGrid({ size: 6, planeColor: 0x3f4954, gridColor: 0x4c5866 });
  scene.add(floor);

  const glazing = new MeshPhysicalMaterial({
    color: 0x8fb3c4,
    roughness: 0.06,
    metalness: 0,
    transmission: 0.7,
    thickness: 0.02,
    transparent: true,
    opacity: 0.55,
    // A plane has no back, so it needs both sides drawn.
    side: DoubleSide,
  });

  const params = {
    arch: "semicircle" as ArchStyle,
    width: 1.24,
    height: 1.15,
    archHeight: 0.62,
    rebate: 0,
    curveSegments: 24,
    readout: "",
  };

  let pane = new Mesh(new PaneGeometry(params2()), glazing);
  scene.add(pane);
  report();

  function params2() {
    return {
      opening: {
        width: params.width,
        height: params.height,
        arch: params.arch,
        archHeight: params.archHeight,
      },
      rebate: params.rebate,
      curveSegments: params.curveSegments,
    };
  }

  function report() {
    pane.geometry.computeBoundingBox();
    const b = pane.geometry.boundingBox!;
    params.readout =
      `${pane.geometry.attributes.position!.count} verts · ` +
      `${(b.max.x - b.min.x).toFixed(3)} x ${(b.max.y - b.min.y).toFixed(3)}`;
  }

  const rebuild = () => {
    pane.geometry.dispose();
    pane.geometry = new PaneGeometry(params2());
    report();
  };

  const gui = new GUI();
  gui.title("Pane");

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
  opening.add(params, "height", 0.3, 2, 0.02).name("Springing").onChange(rebuild);
  opening.add(params, "archHeight", 0.1, 1.4, 0.02).name("Rise").onChange(rebuild);
  opening.add(params, "curveSegments", 3, 64, 1).name("Curve Segments").onChange(rebuild);
  opening.open();

  const glass = gui.addFolder("Glass");
  // Positive grows the pane OUTWARD — a real pane is oversize, hidden in the frame's rebate.
  glass.add(params, "rebate", -0.05, 0.08, 0.002).name("Rebate").onChange(rebuild);
  glass.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Geometry").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    pane.geometry.dispose();
    glazing.dispose();
    floor.dispose();
    dispose();
  };
}
