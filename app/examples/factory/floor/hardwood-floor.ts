import GUI from "lil-gui";
import { DirectionalLight, MathUtils } from "three";
import { HardwoodFloor } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Hardwood Floor",
  description:
    "Planed boards laid at ANY angle and cut to the room. The laying rules are the same ones the rustic " +
    "Plank Floor uses — rows of boards butted end to end, joints staggered from the row alongside, a " +
    "shortened starter board, no runt at the end of a run — and they never learn that the rows are not " +
    "square to the room: the boards are laid on a sheet sized to cover it, then clipped to its outline. " +
    "Clipping rather than mitering is the point. Drag Rotation to 45° and watch the corners: a board " +
    "crossing one comes back with five or six sides, which no pair of cut planes could express, while at 0° " +
    "the clip is a no-op and the general case costs nothing. The cut boards at the walls are not a defect — " +
    "a wall is a boundary condition, not the end of the floor, and a carpenter cuts what the room demands. " +
    "The whole thing bakes to ONE draw call at any size.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x1a1712,
    cameraPosition: [3.6, 3.2, 4.4],
  });

  controls.target.set(0, 0, 0);
  controls.update();

  const key = new DirectionalLight(0xfff1dd, 1.5);
  key.position.set(2.5, 4, 2);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-3, 1, -2);
  scene.add(key, bounce);

  const params = {
    rotationDegrees: 45,
    width: 5,
    depth: 4,
    plankWidth: 0.2,
    plankThickness: 0.055,
    gap: 0.012,
    minPlankLength: 0.5,
    maxPlankLength: 1.4,
    minStagger: 0.35,
    minSliverArea: 0.004,
    color: "#6b4b2c",
    colorVariance: 0.06,
    seed: 0x51ab,
    laid: "",
    perimeter: "",
    budget: "",
  };

  let floor: HardwoodFloor;

  const build = () => {
    floor = new HardwoodFloor({
      ...params,
      rotation: MathUtils.degToRad(params.rotationDegrees),
    });
    scene.add(floor);

    const geometry = floor.mesh.geometry;
    const index = geometry.getIndex();
    const tris = (index ? index.count : geometry.getAttribute("position").count) / 3;

    params.laid = `${floor.boardCount} boards in ${floor.rowCount} rows · stagger asked ${params.minStagger.toFixed(3)}, got ${floor.closestJoint.toFixed(4)}`;
    params.perimeter = `${floor.clippedCount} cut to the room · ${floor.sliverCount} offcuts too small to lay`;
    // Groups are what split a merged geometry back into separate draw calls. None: the tint rides a vertex
    // attribute, so a floor of any size is one.
    params.budget = `${tris.toLocaleString()} tris · 1 geometry · 1 material · ${Math.max(1, geometry.groups.length)} draw call`;
  };

  const rebuild = () => {
    scene.remove(floor);
    floor.dispose();
    build();
  };
  build();

  const gui = new GUI();
  gui.title("Hardwood Floor");

  const run = gui.addFolder("Run");
  // 0 lays them along the room and the clip becomes a no-op. 45 is the classic diagonal.
  run.add(params, "rotationDegrees", 0, 90, 1).name("Rotation °").onChange(rebuild);
  run.add(params, "width", 1.5, 14, 0.5).name("Room Width").onChange(rebuild);
  run.add(params, "depth", 1.5, 14, 0.5).name("Room Depth").onChange(rebuild);
  run.open();

  const boards = gui.addFolder("Boards");
  boards.add(params, "plankWidth", 0.06, 0.5, 0.01).name("Width").onChange(rebuild);
  boards.add(params, "plankThickness", 0.02, 0.2, 0.005).name("Thickness").onChange(rebuild);
  boards.add(params, "gap", 0, 0.05, 0.002).name("Gap Between Rows").onChange(rebuild);
  // ABSOLUTE lengths, not fractions: a bigger room takes MORE boards, not longer ones.
  boards.add(params, "minPlankLength", 0.2, 3, 0.05).name("Shortest Board").onChange(rebuild);
  boards.add(params, "maxPlankLength", 0.3, 4, 0.05).name("Longest Board").onChange(rebuild);
  boards.open();

  const laying = gui.addFolder("Laying");
  // THE rule. Take it to zero and the floor becomes a grid of aligned butt joints.
  laying.add(params, "minStagger", 0, 1.5, 0.01).name("Min Stagger").onChange(rebuild);
  // A judgement, not a calculation. Zero fills the corners with needles; too high leaves a notch at the wall.
  laying.add(params, "minSliverArea", 0, 0.05, 0.001).name("Min Sliver Area").onChange(rebuild);
  laying.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);
  laying.open();

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "color").name("Timber").onChange(rebuild);
  // Per board, not per vertex — the whole board takes one tint, so it reads as a board.
  colour.add(params, "colorVariance", 0, 0.25, 0.005).name("Variance").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "laid").name("Laid").listen().disable();
  readout.add(params, "perimeter").name("Perimeter").listen().disable();
  readout.add(params, "budget").name("Cost").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    scene.remove(floor);
    floor.dispose();
    dispose();
  };
}
