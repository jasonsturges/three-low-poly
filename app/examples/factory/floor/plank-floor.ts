import GUI from "lil-gui";
import { DirectionalLight, Mesh, MeshStandardMaterial } from "three";
import { PlankFloor } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Plank Floor",
  description:
    "A boarded floor, LAID rather than tiled. The mistake that makes a plank floor read as stripes is " +
    "spanning each board across the whole room — a real floor is rows of several boards butted end to end, " +
    "with the end joints in neighbouring rows deliberately kept apart. Drag Min Stagger to nothing and " +
    "watch the joints line up into a grid; no amount of colour or edge wander rescues it. Two smaller " +
    "trade rules are in there too: each row opens with a shortened starter board, and a row never ends on " +
    "a runt. Every board is its own weathered plank with its own seed, so none repeat — and because they " +
    "all differ, the whole floor MERGES: one geometry, one material, ONE DRAW CALL at any size. Watch the " +
    "Readout while you grow the room past four thousand boards.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x1a1712,
    cameraPosition: [3.4, 2.8, 4.2],
  });

  controls.target.set(0, 0, 0);
  controls.update();

  const key = new DirectionalLight(0xfff1dd, 1.5);
  key.position.set(2.5, 4, 2);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-3, 1, -2);
  scene.add(key, bounce);

  const params = {
    length: 6,
    depth: 4,
    plankWidth: 0.2,
    plankThickness: 0.055,
    gap: 0.012,

    minPlankLength: 0.5,
    maxPlankLength: 1.4,
    minStagger: 0.35,

    plankEdgeRoughness: 0.05,
    plankEndSkew: 0.06,
    plankBow: 0.12,

    color: "#6b4b2c",
    colorVariance: 0.06,

    seed: 0x51ab,
    planks: "",
    stagger: "",
    budget: "",
  };

  let floor: PlankFloor;

  const build = () => {
    floor = new PlankFloor(params);
    scene.add(floor);

    const geometry = floor.mesh.geometry;
    const index = geometry.getIndex();
    const tris = (index ? index.count : geometry.getAttribute("position").count) / 3;
    // Groups are what split a merged geometry back into separate draw calls. None here: the tint rides a
    // vertex attribute instead, so the whole floor is one.
    const draws = Math.max(1, geometry.groups.length);

    params.planks = `${floor.plankCount} boards in ${floor.rowCount} rows · ${floor.plankWidth.toFixed(4)} wide`;
    params.stagger = `asked ${params.minStagger.toFixed(3)} · got ${floor.closestJoint.toFixed(4)}`;
    params.budget = `${tris.toLocaleString()} tris · 1 geometry · 1 material · ${draws} draw call`;
  };

  const rebuild = () => {
    scene.remove(floor);
    floor.dispose();
    build();
  };
  build();

  const gui = new GUI();
  gui.title("Plank Floor");

  const room = gui.addFolder("Room");
  room.add(params, "length", 1, 30, 0.5).name("Length (along boards)").onChange(rebuild);
  room.add(params, "depth", 1, 30, 0.5).name("Depth (across)").onChange(rebuild);
  room.open();

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
  laying.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);
  laying.open();

  const weather = gui.addFolder("Weathering");
  // Most of the floor's character. High turns cartoonish, which is a style of its own; low reads planed.
  weather.add(params, "plankEdgeRoughness", 0, 0.25, 0.005).name("Edge Roughness").onChange(rebuild);
  weather.add(params, "plankEndSkew", 0, 0.25, 0.005).name("End Skew").onChange(rebuild);
  weather.add(params, "plankBow", 0, 0.6, 0.01).name("Bow").onChange(rebuild);
  weather.open();

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "color").name("Timber").onChange(rebuild);
  // Per board, not per vertex — the whole board takes one tint, so it reads as a board.
  colour.add(params, "colorVariance", 0, 0.25, 0.005).name("Variance").onChange(rebuild);
  colour.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "planks").name("Laid").listen().disable();
  readout.add(params, "stagger").name("Stagger").listen().disable();
  readout.add(params, "budget").name("Cost").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    scene.remove(floor);
    floor.dispose();
    dispose();
  };
}
