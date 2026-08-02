import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  WireframeGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32, StoneWall } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Corner Assembly",
  description:
    "STUDY — what happens where two walls MEET, which turned out to be a bigger question than the quoins " +
    "that sit on it. Quoins are here because they are the corner's treatment, and they behave: the " +
    "realisation that makes them simple is that a quoin is NOT an L-shaped block but a rectangular stone " +
    "showing a LONG face on one wall and a SHORT end on the other, so every pattern is a rule for two " +
    "numbers per course. Those are shipped. What is NOT solved is underneath them. Turn Show Quoins off " +
    "and look into the corner: two independent coursings occupy the same cube, each wall's end caps land " +
    "coplanar with the other's outer face, both mortar cores cross at right angles, and the pale core " +
    "reads at the wall's end because a facade has no business being seen from the side. Every part is " +
    "correct on its own. The JOIN is the open problem, and it is the same one merlons on a wall head, a " +
    "buttress against a face, and any two walls at an angle will all run into."};

//------------------------------
//  Vocabulary
//------------------------------
//
//  QUOIN        a dressed stone at an external corner. From the French `coin`. Pronounced "coin".
//               SHIPPED as `QuoinStackGeometry` — this study keeps them only as the corner's treatment.
//  LONG FACE    the stretcher face, showing along one wall. The SHORT end shows along the other.
//  RUSTICATED   quoins with a deliberately rough or recessed face, so the corner reads as heavier than
//               the wall it turns. A face treatment rather than a layout — not modelled here.
//  RETURN       how far a quoin runs along a wall from the corner. The two legs are its two returns.
//  TOOTHING     leaving alternate stones projecting so another wall can be bonded in later. What the
//               alternating pattern imitates, and why it reads as structural rather than applied.
//  LACING       courses of quoins run right through the wall rather than stopping at the corner. Not this.

type Pattern = "straight" | "alternating" | "staggered";

/** One quoin: how far it runs along each wall, and how tall. */
interface Quoin {
  y: number;
  height: number;
  /** Return along wall A — the wall running on X. */
  legA: number;
  /** Return along wall B — the wall running on Z. */
  legB: number;
}

/**
 * The stack, as lengths rather than geometry.
 *
 * Every pattern is a rule for two numbers per course. That is the whole difference between them, which is
 * why one function covers the catalogue and no pattern needs its own construction.
 */
const stackQuoins = (
  height: number,
  course: number,
  pattern: Pattern,
  longLeg: number,
  shortLeg: number,
  everyOther: boolean,
  phase: number,
): Quoin[] => {
  const courses = Math.max(1, Math.round(height / course));
  const step = height / courses;
  const quoins: Quoin[] = [];

  for (let c = 0; c < courses; c++) {
    // A gapped stack — "teeth of a comb" — leaves the wall showing between quoins. Real where the corner
    // is an accent rather than a structural tie.
    if (everyOther && (c + phase) % 2 !== 0) continue;

    // The pattern advances per QUOIN LAID, not per course. Keying it to the course instead makes gapping
    // and alternating cancel each other out: taking every second course only ever lands on one phase, so
    // the long face stops swapping and the corner silently reverts to straight.
    const swap = (quoins.length + phase) % 2 === 1;
    let legA = longLeg;
    let legB = shortLeg;

    if (pattern === "straight") {
      // Equal returns, every course the same. The plainest, and what reads as a simple stacked column.
      legA = longLeg;
      legB = longLeg;
    } else if (pattern === "alternating") {
      // The long face walks from one wall to the other. This is TOOTHING — it reads as though the two
      // walls are bonded into each other rather than merely meeting.
      legA = swap ? shortLeg : longLeg;
      legB = swap ? longLeg : shortLeg;
    } else {
      // One leg varies, the other holds. A softer step, and the one that keeps a clean line on wall B.
      legA = swap ? shortLeg : longLeg;
      legB = longLeg;
    }

    quoins.push({ y: (c + 0.5) * step, height: step, legA, legB });
  }

  return quoins;
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x14161c,
    // Looking into the outside corner, from the quadrant both faces open onto.
    cameraPosition: [3.6, 2.6, 4.0],
  });

  controls.target.set(-0.4, 1.3, -0.4);
  controls.update();

  const key = new DirectionalLight(0xfff2e2, 1.45);
  key.position.set(3, 3.5, 2.5);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-2.5, 0.5, -2.5);
  scene.add(key, bounce);

  const quoinMaterial = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    pattern: "alternating" as Pattern,
    wallLength: 2.6,
    wallHeight: 2.8,
    thickness: 0.34,
    courseHeight: 0.26,

    longLeg: 0.44,
    shortLeg: 0.22,
    proud: 0.032,
    everyOther: false,
    phase: 0,

    // Quoins are usually a BETTER stone than the wall they turn — dressed limestone against rubble or
    // brick — so the default is a bold, fairly uniform contrast rather than a subtle one. The alternating
    // tint is a real capability but it reads as two deliveries of stone, so it starts off.
    color: "#d6ccb6",
    wallColor: "#5f5a54",
    colorVariance: 0.025,
    alternateTint: false,
    seed: 0x2c1a,

    showWalls: true,
    showQuoins: true,
    wireframe: false,
    laid: "",
    reach: "",
  };

  const stage = new Group();
  scene.add(stage);
  let walls: StoneWall[] = [];

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
    walls.forEach((w) => {
      stage.remove(w);
      w.dispose();
    });
    walls = [];
  };

  const rebuild = () => {
    clear();

    const { thickness, wallLength, wallHeight, courseHeight } = params;
    // The corner sits at the origin. Wall A runs away on −X with its face on +Z; wall B runs away on −Z
    // with its face on +X. So the outside corner opens onto the +X +Z quadrant, facing the camera.
    const face = thickness / 2;

    if (params.showWalls) {
      const wallOptions = {
        width: wallLength,
        height: wallHeight,
        thickness,
        courseHeight,
        seed: params.seed,
        color: params.wallColor,
        // The wall's relief is SUBORDINATE to the quoin's, and derived from it so it cannot compete at any
        // setting. A proud stone reaches `proudDepth × 1.6` at the top of its range, so capping the depth
        // at 40% of the quoin's projection puts the tallest wall stone at 64% of the quoin — visible, and
        // never out in front of the thing it is supposed to defer to.
        //
        // Left alone it does compete: the factory default of 0.03 reaches 0.048 against a quoin standing
        // 0.032 proud, so a third of the wall's stones out-project the corner.
        proudDepth: params.proud * 0.4,
        proudChance: 0.07,
        depthVariance: 0.004,
      };
      // BOTH walls run to the OUTER corner and overlap in the corner square, rather than stopping at the
      // corner LINE. A wall centred on its own length ends at the origin, which leaves the `thickness ×
      // thickness` square at the corner empty — and the emptier it gets the thicker the wall is, until the
      // quoins are visibly floating clear of anything.
      //
      // Interpenetrating solids are fine; two coplanar FACES are not. Here each wall's end cap lands on the
      // other's outer face at the corner, which is the one place a quoin covers by definition. That is not a
      // coincidence — covering exactly this is a large part of what quoins are FOR.
      const reach = thickness / 2;
      const a = new StoneWall(wallOptions);
      a.position.set(-wallLength / 2 + reach, 0, 0);
      const b = new StoneWall({ ...wallOptions, seed: params.seed + 977 });
      b.rotation.y = Math.PI / 2;
      b.position.set(0, 0, -wallLength / 2 + reach);
      walls = [a, b];
      stage.add(a, b);
    }

    const quoins = stackQuoins(
      wallHeight,
      courseHeight,
      params.pattern,
      params.longLeg,
      params.shortLeg,
      params.everyOther,
      Math.round(params.phase),
    );

    const random = mulberry32(params.seed ^ 0x5bf0);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    const base = new Color(params.color);
    const tint = new Color();
    const parts: BufferGeometry[] = [];

    let maxReach = 0;
    quoins.forEach((q, index) => {
      // The block's outer corner stands `proud` past both wall faces. That return matters twice over:
      // stopping flush would put the quoin's end exactly on the plane of the other wall's face, and two
      // coplanar surfaces fight. Standing proud is both correct masonry and the fix.
      const outer = face + params.proud;
      const block = new BoxGeometry(q.legA, q.height * 0.96, q.legB);
      block.translate(outer - q.legA / 2, q.y, outer - q.legB / 2);
      maxReach = Math.max(maxReach, q.legA, q.legB);

      // ONE stack, TWO walls — so the tint alternates PER COURSE. Were this built as two stacks each
      // contributing alternate courses, each stack would need a UNIFORM tint instead, opposite to its
      // neighbour: both alternating in step would give light, light, dark, dark. Ownership decides the
      // rule, and inverting the ownership inverts it.
      const shade = params.alternateTint && index % 2 === 1 ? -params.colorVariance : params.colorVariance;
      tint.copy(base).offsetHSL(signed(params.colorVariance) / 4, 0, shade * 0.5 + signed(params.colorVariance) / 2);

      const count = block.attributes.position!.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = tint.r;
        colors[i * 3 + 1] = tint.g;
        colors[i * 3 + 2] = tint.b;
      }
      block.setAttribute("color", new BufferAttribute(colors, 3));
      parts.push(block);
    });

    const merged = params.showQuoins ? mergeGeometries(parts, false) : null;
    if (!params.showQuoins) parts.forEach((part) => part.dispose());
    if (params.showQuoins) parts.forEach((part) => part.dispose());
    if (merged) {
      stage.add(new Mesh(merged, quoinMaterial));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(merged), wire));
    }

    const courses = Math.max(1, Math.round(wallHeight / courseHeight));
    params.laid = `${quoins.length} quoins over ${courses} courses · ${params.pattern}`;
    params.reach = `longest return ${maxReach.toFixed(3)} · stands ${params.proud.toFixed(3)} proud of both faces`;
  };
  rebuild();

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
    .onChange(rebuild);
  pattern.add(params, "longLeg", 0.1, 1, 0.02).name("Long Leg").onChange(rebuild);
  pattern.add(params, "shortLeg", 0.05, 1, 0.02).name("Short Leg").onChange(rebuild);
  // Teeth of a comb — the wall shows between quoins. An accent rather than a structural tie.
  pattern.add(params, "everyOther").name("Every Other").onChange(rebuild);
  // Which course the pattern starts on. Two corners of one building want opposite phases, or they mirror.
  pattern.add(params, "phase", 0, 1, 1).name("Phase").onChange(rebuild);
  pattern.open();

  const build = gui.addFolder("Corner");
  build.add(params, "wallLength", 1, 6, 0.1).name("Wall Length").onChange(rebuild);
  build.add(params, "wallHeight", 1, 6, 0.1).name("Wall Height").onChange(rebuild);
  build.add(params, "thickness", 0.1, 1, 0.02).name("Thickness").onChange(rebuild);
  build.add(params, "courseHeight", 0.1, 0.8, 0.01).name("Course Height").onChange(rebuild);
  // How far the quoin pushes out of BOTH wall faces — which is most of why a corner reads as dressed
  // rather than merely turned. On a 340mm wall: under 0.02 is a shadow line, 0.02–0.045 is clearly proud,
  // and past that is RUSTICATED. It is also not optional at 0 — flush would land the quoin's end exactly
  // coplanar with the other wall's face, and two coplanar surfaces fight.
  build.add(params, "proud", 0, 0.08, 0.002).name("Proud").onChange(rebuild);
  build.add(params, "showWalls").name("Show Walls").onChange(rebuild);
  build.open();

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "color").name("Color").onChange(rebuild);
  // Both are reachable, because the study is about the CONTRAST rather than either stone alone.
  colour.addColor(params, "wallColor").name("Wall Color").onChange(rebuild);
  colour.add(params, "colorVariance", 0, 0.25, 0.005).name("Color Variance").onChange(rebuild);
  // ONE stack owns the corner, so it alternates per course. Two stacks would each want a uniform tint.
  colour.add(params, "alternateTint").name("Alternate Tint").onChange(rebuild);
  colour.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  // For looking at what the two walls are doing to each other in the corner square. The quoins cover that
  // region by design, which is the point of them — and also what makes it impossible to inspect.
  inspect.add(params, "showQuoins").name("Show Quoins").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "laid").name("Laid").listen().disable();
  readout.add(params, "reach").name("Reach").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    quoinMaterial.dispose();
    wire.dispose();
    dispose();
  };
}
