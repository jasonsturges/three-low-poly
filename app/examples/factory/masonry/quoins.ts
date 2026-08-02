import GUI from "lil-gui";
import { BoxGeometry, DirectionalLight, Group, Mesh, MeshStandardMaterial } from "three";
import { QuoinStackGeometry, type QuoinPattern } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Quoins",
  description:
    "The dressed stones at a building's external corner. The realisation that makes this simple: a quoin " +
    "is NOT an L-shaped block. It is a rectangular stone laid so it shows a LONG face on one wall and a " +
    "SHORT end on the other — so every pattern in the catalogue is just a rule for those two returns per " +
    "course. Straight keeps them equal; Alternating swaps them each course, which is TOOTHING and reads as " +
    "though the two walls are bonded into one another; Staggered varies one leg and holds the other. " +
    "Standing proud is not decoration either: flush would land the quoin's end exactly coplanar with the " +
    "other wall's face, and two coplanar surfaces fight. The walls here are deliberately plain boxes — a " +
    "backdrop cannot be a co-star, and how two masonry walls actually meet is its own problem, kept in the " +
    "Corner Assembly study.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x14161c,
    cameraPosition: [3.4, 2.5, 3.8],
  });

  controls.target.set(-0.4, 1.3, -0.4);
  controls.update();

  const key = new DirectionalLight(0xfff2e2, 1.45);
  key.position.set(3, 3.5, 2.5);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-2.5, 0.5, -2.5);
  scene.add(key, bounce);

  // `vertexColors` is required: the per-course tint rides a vertex attribute, so a plain material would
  // render every quoin white.
  const stone = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const render = new MeshStandardMaterial({ color: 0x5f5a54, roughness: 1, flatShading: true });

  const params = {
    pattern: "alternating" as QuoinPattern,
    height: 2.8,
    courseHeight: 0.26,
    longLeg: 0.44,
    shortLeg: 0.22,
    everyOther: false,
    phase: 0,
    wallThickness: 0.34,
    proud: 0.032,
    color: "#d6ccb6",
    colorVariance: 0.025,
    alternateTint: false,
    seed: 0x2c1a,
    wallLength: 2.6,
    laid: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const build = () => {
    clear();
    const { wallThickness: t, wallLength: L, height } = params;

    // Plain boxes, on purpose. Both run to the OUTER corner and overlap in the corner square — a wall
    // that stops at the corner LINE leaves a `t × t` hole that grows with thickness.
    const a = new Mesh(new BoxGeometry(L, height, t), render);
    a.position.set(-L / 2 + t / 2, height / 2, 0);
    const b = new Mesh(new BoxGeometry(t, height, L), render);
    b.position.set(0, height / 2, -L / 2 + t / 2);
    stage.add(a, b);

    // The origin is the corner LINE — where the two walls' centre planes cross — so placing the stack is
    // one line. `wallThickness` and `proud` carry it out to where a quoin actually sits.
    const geometry = new QuoinStackGeometry(params);
    const quoins = new Mesh(geometry, stone);
    quoins.castShadow = true;
    stage.add(quoins);

    params.laid = `${geometry.quoinCount} quoins over ${geometry.courseCount} courses of ${geometry.courseHeight.toFixed(4)}`;
  };
  build();

  const gui = new GUI();
  gui.title("Quoins");

  const pattern = gui.addFolder("Pattern");
  // The whole taxonomy, as a rule for two numbers per course.
  pattern
    .add(params, "pattern", {
      "Straight — equal returns": "straight",
      "Alternating — the long face swaps walls": "alternating",
      "Staggered — one leg varies": "staggered",
    })
    .name("Pattern")
    .onChange(build);
  pattern.add(params, "longLeg", 0.1, 1, 0.02).name("Long Leg").onChange(build);
  pattern.add(params, "shortLeg", 0.05, 1, 0.02).name("Short Leg").onChange(build);
  // Teeth of a comb — the wall shows between quoins. The pattern still advances per quoin LAID, so this
  // composes with Alternating instead of cancelling it.
  pattern.add(params, "everyOther").name("Every Other").onChange(build);
  // Two corners of one building want opposite phases, or the pattern mirrors instead of continuing round.
  pattern.add(params, "phase", 0, 1, 1).name("Phase").onChange(build);
  pattern.open();

  const corner = gui.addFolder("Corner");
  corner.add(params, "height", 1, 6, 0.1).name("Height").onChange(build);
  corner.add(params, "courseHeight", 0.1, 0.8, 0.01).name("Course Height").onChange(build);
  corner.add(params, "wallThickness", 0.1, 1, 0.02).name("Wall Thickness").onChange(build);
  // Under 0.02 is a shadow line, 0.02–0.045 is clearly proud, past that is RUSTICATED. Never 0.
  corner.add(params, "proud", 0, 0.08, 0.002).name("Proud").onChange(build);
  corner.add(params, "wallLength", 1, 6, 0.1).name("Wall Length").onChange(build);
  corner.open();

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "color").name("Color").onChange(build);
  colour.add(params, "colorVariance", 0, 0.25, 0.005).name("Color Variance").onChange(build);
  // Only correct because ONE stack owns the corner. Two stacks would each want a uniform tint instead.
  colour.add(params, "alternateTint").name("Alternate Tint").onChange(build);
  colour.add(params, "seed", 0, 65535, 1).name("Seed").onChange(build);

  const readout = gui.addFolder("Readout");
  readout.add(params, "laid").name("Laid").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    render.dispose();
    dispose();
  };
}
