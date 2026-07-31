import GUI from "lil-gui";
import { Group, Mesh, MeshStandardMaterial } from "three";
import {
  type ArchStyle,
  DiamondLatticeWindow,
  GroundGrid,
  type WallOpeningOptions,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Diamond Lattice Window",
  description:
    "A leaded light: glass, diamond leading, and the frame that carries it — one factory, because leading " +
    "has to be framed and the three are a unit that exists in the world. There is no separate arched " +
    "version: `arch: \"square\"` is a flat head, so every style in the dropdown is the same code. Drive it " +
    "with CELL COUNTS rather than an angle — the diamonds' corners then land exactly on the jambs, the " +
    "sill and the springing, and the readout shows the angle and spacing that fell out. Above the " +
    "springing the head cuts what it cuts; a curve is not a whole number of anything. One `opening` object " +
    "builds all three parts, and it is the same object you would punch the wall with.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x7d8a99,
    cameraPosition: [1.1, 1.5, 2.7],
  });

  controls.target.set(0, 0.95, 0);
  controls.update();

  const floor = new GroundGrid({ size: 6, planeColor: 0x3f4954, gridColor: 0x4c5866 });
  scene.add(floor);

  // A stand-in for the wall, punched with the SAME opening — the point of sharing the description.
  const backdrop = new MeshStandardMaterial({ color: 0x5c6672, roughness: 1 });

  const params = {
    arch: "pointed" as ArchStyle,
    width: 1.24,
    springing: 1.15,
    archHeight: 0.78,
    cellsX: 4,
    cellsY: 4,
    cameWidth: 0.022,
    cameDepth: 0.031,
    curveSegments: 24,
    frame: true,
    glass: true,
    frameOutset: 0.035,
    readout: "",
  };

  const stage = new Group();
  scene.add(stage);

  let light: DiamondLatticeWindow | null = null;

  const opening = (): WallOpeningOptions => ({
    width: params.width,
    height: params.springing,
    arch: params.arch,
    archHeight: params.archHeight,
  });

  const build = () => {
    light?.dispose();
    if (light) stage.remove(light);

    light = new DiamondLatticeWindow({
      opening: opening(),
      cellsX: params.cellsX,
      cellsY: params.cellsY,
      cameWidth: params.cameWidth,
      cameDepth: params.cameDepth,
      curveSegments: params.curveSegments,
      frame: params.frame ? { outset: params.frameOutset } : false,
      glass: params.glass,
    });
    stage.add(light);

    // Angle and spacing are OUTPUTS of the cell counts — reported, never asked for.
    params.readout =
      `${light.cellsX}x${light.cellsY} cells · angle ${light.angle.toFixed(2)}° · ` +
      `spacing ${light.spacing.toFixed(4)} · ${light.lattice.geometry.cameCount} cames`;
  };
  build();

  const gui = new GUI();
  gui.title("Diamond Lattice Window");

  const shape = gui.addFolder("Opening");
  // Every style here is the same code. `square` IS the rectangular window.
  shape
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
    .onChange(build);
  shape.add(params, "width", 0.5, 2.2, 0.02).name("Width").onChange(build);
  shape.add(params, "springing", 0.3, 2, 0.02).name("Springing").onChange(build);
  shape.add(params, "archHeight", 0.1, 1.4, 0.02).name("Rise").onChange(build);
  shape.add(params, "curveSegments", 4, 48, 1).name("Curve Segments").onChange(build);
  shape.open();

  const leading = gui.addFolder("Leading");
  // Counts, not an angle — this is what makes the diamonds land on the jambs and the sill.
  leading.add(params, "cellsX", 1, 10, 1).name("Cells Across").onChange(build);
  leading.add(params, "cellsY", 1, 10, 1).name("Cells Up").onChange(build);
  // Sizes the frame as well, which is why the assembly owns it.
  leading.add(params, "cameWidth", 0.008, 0.06, 0.001).name("Came Width").onChange(build);
  leading.add(params, "cameDepth", 0.008, 0.1, 0.001).name("Came Depth").onChange(build);
  leading.open();

  const parts = gui.addFolder("Parts");
  parts.add(params, "frame").name("Frame").onChange(build);
  parts.add(params, "glass").name("Glass").onChange(build);
  // Reaches 0 on purpose. The frame's visible band is `inset + outset`, and `inset` is already the came's
  // width — so at 0 the frame is exactly one came wide and the leading reads as running right through it.
  parts.add(params, "frameOutset", 0, 0.12, 0.001).name("Frame Outset").onChange(build);
  parts.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Fitted").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    light?.dispose();
    backdrop.dispose();
    floor.dispose();
    dispose();
  };
}
