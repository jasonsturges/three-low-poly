import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { mulberry32 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Brick Wall",
  description:
    "STUDY — the rigid end of the masonry line, and two findings hide in it. FIRST, the mortar goes the " +
    "OTHER WAY: a brick is manufactured at a fixed size, so the joint ADDS to the pitch and the wall " +
    "grows, where dressed stone is cut to suit a course and the joint comes OUT of the stone. Switch " +
    "Mortar and watch the Readout — the same numbers build two different walls. SECOND, a brick wall is " +
    "not one geometry. A wall is never a whole number of bricks wide, and a running bond starts alternate " +
    "courses half a brick along, so the ends need CLOSERS — cut bricks. Set Ends to Ragged for the naive " +
    "answer (skip anything that overhangs, leave a torn edge) and to Closers for the real one, then read " +
    "how many distinct geometries it took. A brick is the most identical object in masonry and it still " +
    "does not get away with one.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  STRETCHER    a brick laid with its long face showing. What this wall is entirely made of.
//  HEADER       laid with its END showing, tying two skins together. English and Flemish bonds alternate
//               headers and stretchers; stretcher bond, which this is, is one skin thick.
//  BAT          a cut brick. A HALF BAT is half a brick, and starts every other course of a running bond.
//  CLOSER       the cut brick that finishes a course. A QUEEN CLOSER is a quarter, set beside the quoin
//               to move the bond over.
//  PERPEND      the vertical joint. The bond exists to stop these lining up.
//  COURSE       one row. GAUGE is course height including its bed joint — the number a bricklayer works to.
//  BOND         stretcher (running), stack, English, Flemish. Only the first two are here.

type Ends = "closers" | "ragged";
type Mortar = "adds" | "subtracts";

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x14161c,
    cameraPosition: [2.8, 2.2, 4.2],
  });

  controls.target.set(0, 1.3, 0);
  controls.update();

  const key = new DirectionalLight(0xfff2e2, 1.45);
  key.position.set(2.8, 3, 3);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-2.5, 0.5, -2);
  scene.add(key, bounce);

  const clay = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });

  const params = {
    width: 3.4,
    height: 2.6,
    brickLength: 0.44,
    brickHeight: 0.14,
    brickDepth: 0.2,
    mortarGap: 0.018,
    mortar: "adds" as Mortar,
    mortarCore: true,
    mortarRecess: 0.01,
    mortarColor: "#a8a094",
    bondOffset: 0.5,
    courseEnds: "closers" as Ends,
    minBat: 0.25,
    positionJitter: 0.004,
    rotationJitter: 0.012,
    clayColor: "#8b4a2f",
    colorVariance: 0.11,
    seed: 0x2c1a,
    laid: "",
    cost: "",
    gauge: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    const seen = new Set<BufferGeometry>();
    for (const child of [...stage.children]) {
      if (child instanceof InstancedMesh) {
        seen.add(child.geometry);
        child.dispose();
        stage.remove(child);
      }
    }
    for (const geometry of seen) geometry.dispose();
  };

  const rebuild = () => {
    clear();

    const random = mulberry32(params.seed);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    const base = new Color(params.clayColor);

    // THE CONVENTION. `adds` keeps the brick at its manufactured size and lets the wall grow — what a
    // bricklayer does. `subtracts` keeps the pitch and shaves the brick — what a mason dressing stone to
    // a course does. Neither is wrong; they belong to different trades.
    const pitch =
      params.mortar === "adds" ? params.brickLength + params.mortarGap : params.brickLength;
    const cutLength =
      params.mortar === "adds" ? params.brickLength : Math.max(0.02, params.brickLength - params.mortarGap);
    const gauge =
      params.mortar === "adds" ? params.brickHeight + params.mortarGap : params.brickHeight;
    const cutHeight =
      params.mortar === "adds" ? params.brickHeight : Math.max(0.02, params.brickHeight - params.mortarGap);

    const courses = Math.max(1, Math.floor(params.height / gauge));

    // Bricks are grouped by the LENGTH they were cut to. A whole wall of identical bricks wants one
    // geometry; the moment the ends are closed properly it wants one per distinct bat as well. Rounding to
    // a tenth of a millimetre keeps two bats that differ only by float noise from becoming two geometries.
    const byLength = new Map<number, { length: number; matrices: Matrix4[]; tints: Color[] }>();
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Euler();
    const quaternion = new Quaternion();
    const scale = new Vector3(1, 1, 1);
    const tint = new Color();

    let whole = 0;
    let bats = 0;

    const lay = (x: number, y: number, length: number) => {
      position.set(
        x + length / 2 - params.width / 2 + signed(params.positionJitter),
        y + signed(params.positionJitter),
        signed(params.positionJitter),
      );
      rotation.set(
        signed(params.rotationJitter),
        signed(params.rotationJitter),
        signed(params.rotationJitter),
      );
      quaternion.setFromEuler(rotation);
      matrix.compose(position, quaternion, scale);
      tint
        .copy(base)
        .offsetHSL(signed(params.colorVariance) / 5, signed(params.colorVariance) / 2, signed(params.colorVariance));

      const cut = params.mortar === "adds" ? length : Math.max(0.02, length - params.mortarGap);
      const bin = Math.round(cut * 10000) / 10000;
      let group = byLength.get(bin);
      if (!group) {
        group = { length: bin, matrices: [], tints: [] };
        byLength.set(bin, group);
      }
      group.matrices.push(matrix.clone());
      group.tints.push(tint.clone());
      if (Math.abs(cut - cutLength) < 1e-6) whole++;
      else bats++;
    };

    for (let c = 0; c < courses; c++) {
      const y = (c + 0.5) * gauge;
      // A running bond starts alternate courses part-way along. That opening piece is a HALF BAT — a real
      // cut brick, not a whole one nudged over.
      const offset = (c % 2) * pitch * params.bondOffset;
      let x = 0;

      if (offset > 1e-6) {
        if (params.courseEnds === "closers") {
          lay(0, y, offset > params.mortarGap ? offset - params.mortarGap : offset);
          x = offset;
        } else {
          // The naive answer: start the course at the offset and leave the gap.
          x = offset;
        }
      }

      while (x < params.width - 1e-6) {
        const remaining = params.width - x;
        if (remaining >= pitch) {
          lay(x, y, cutLength);
          x += pitch;
          continue;
        }
        // The end of the course. Either cut a closer to fit, or drop it and leave a torn edge.
        if (params.courseEnds === "closers") {
          const bat = params.mortar === "adds" ? remaining : remaining;
          if (bat > params.brickLength * params.minBat) lay(x, y, bat);
        }
        break;
      }
    }

    // THE MORTAR CORE, borrowed from the stone wall. One box behind everything, recessed from both faces.
    //
    // Brick needs it for a different reason than stone did. Stone's joints were holes because the joint is
    // SUBTRACTED from the unit; brick's joint is ADDED, so the gap between bricks is wider still — the
    // whole `mortarGap` rather than nothing. Without a core a brick wall is a grid of see-through slots.
    //
    // It is one Mesh rather than an InstancedMesh, so it costs one extra draw call. Worth naming, because
    // this study exists to count them.
    if (params.mortarCore) {
      // Recessed on ALL THREE axes. Brick's joint is ADDED rather than subtracted, so its bricks stop a
      // whole `mortarGap` short of the run — a core built to full size stands proud at the ends and rings
      // the wall with a pale edge, which is the opposite of what a core is for.
      const inset = (extent: number) => Math.max(extent * 0.15, extent - params.mortarRecess * 2);
      const core = new BoxGeometry(
        inset(params.width),
        inset(courses * gauge),
        inset(params.brickDepth),
      );
      core.translate(0, (courses * gauge) / 2, 0);
      const mesh = new InstancedMesh(core, clay, 1);
      const m = new Matrix4();
      mesh.setMatrixAt(0, m);
      mesh.setColorAt(0, new Color(params.mortarColor));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.receiveShadow = true;
      stage.add(mesh);
    }

    let drawCalls = 0;
    let tris = 0;
    for (const { length, matrices, tints } of byLength.values()) {
      const geometry = new BoxGeometry(length, cutHeight, params.brickDepth);
      const mesh = new InstancedMesh(geometry, clay, matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      tints.forEach((t, i) => mesh.setColorAt(i, t));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      stage.add(mesh);
      drawCalls++;
      tris += (geometry.getIndex()?.count ?? geometry.getAttribute("position").count) / 3;
    }

    const total = whole + bats;
    params.laid = `${total} bricks · ${courses} courses · ${whole} whole, ${bats} cut`;
    params.cost = `${params.mortarCore ? "+1 core · " : ""}${byLength.size} distinct geometr${byLength.size === 1 ? "y" : "ies"} · ${drawCalls} draw call${drawCalls === 1 ? "" : "s"} · ${tris} tris resident`;
    // The wall the numbers actually built, against the one asked for.
    params.gauge = `gauge ${gauge.toFixed(4)} · pitch ${pitch.toFixed(4)} · built ${(courses * gauge).toFixed(3)} tall of ${params.height} asked`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Brick Wall");

  const wall = gui.addFolder("Wall");
  wall.add(params, "width", 0.5, 8, 0.1).name("Width").onChange(rebuild);
  wall.add(params, "height", 0.3, 6, 0.1).name("Height").onChange(rebuild);
  wall.open();

  const brick = gui.addFolder("Brick");
  // A real imperial brick is 215 × 102.5 × 65mm, laid to a 75mm gauge. These default near that ratio.
  brick.add(params, "brickLength", 0.1, 1, 0.01).name("Length (stretcher)").onChange(rebuild);
  brick.add(params, "brickHeight", 0.04, 0.4, 0.005).name("Height").onChange(rebuild);
  brick.add(params, "brickDepth", 0.05, 0.6, 0.01).name("Depth (bed)").onChange(rebuild);
  brick.open();

  const core = gui.addFolder("Mortar Core");
  // Borrowed from the stone wall, and brick needs it MORE: its joint is added rather than subtracted, so
  // the gap between bricks is the whole mortar gap. Without a core the wall is a grid of slots.
  core.add(params, "mortarCore").name("Mortar Core").onChange(rebuild);
  core.add(params, "mortarRecess", 0, 0.06, 0.002).name("Mortar Recess").onChange(rebuild);
  core.addColor(params, "mortarColor").name("Mortar Color").onChange(rebuild);
  core.open();

  const joint = gui.addFolder("Mortar — finding one");
  joint.add(params, "mortarGap", 0, 0.08, 0.002).name("Mortar Gap").onChange(rebuild);
  // The same numbers build two different walls. Brick ADDS; dressed stone SUBTRACTS.
  joint
    .add(params, "mortar", { "Adds to pitch (brick)": "adds", "Comes out of the unit (stone)": "subtracts" })
    .name("Convention")
    .onChange(rebuild);
  joint.open();

  const bond = gui.addFolder("Bond & Ends — finding two");
  // 0.5 is a stretcher bond. 0 is stack bond, which is not a bond at all.
  bond.add(params, "bondOffset", 0, 1, 0.05).name("Bond Offset").onChange(rebuild);
  // Ragged is the naive answer — skip anything that overhangs. Closers is what a bricklayer does, and it
  // is what forces a second geometry.
  bond
    .add(params, "courseEnds", { "Closers — cut to fit": "closers", "Ragged — skip the overhang": "ragged" })
    .name("Course Ends")
    .onChange(rebuild);
  // Below this fraction of a brick, a bat is too small to lay and the joint takes it instead.
  bond.add(params, "minBat", 0, 0.6, 0.02).name("Min Bat").onChange(rebuild);
  bond.open();

  const wobble = gui.addFolder("Laying");
  // Tiny. A bricklayer is good; these are the millimetres that stop it reading as a texture.
  wobble.add(params, "positionJitter", 0, 0.03, 0.001).name("Position Jitter").onChange(rebuild);
  wobble.add(params, "rotationJitter", 0, 0.08, 0.002).name("Rotation Jitter").onChange(rebuild);

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "clayColor").name("Clay Color").onChange(rebuild);
  colour.add(params, "colorVariance", 0, 0.35, 0.005).name("Color Variance").onChange(rebuild);
  colour.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "laid").name("Laid").listen().disable();
  readout.add(params, "cost").name("Cost").listen().disable();
  readout.add(params, "gauge").name("Gauge").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    clay.dispose();
    dispose();
  };
}
