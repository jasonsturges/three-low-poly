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
import { mulberry32 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Stone Wall",
  description:
    "STUDY — the substrate everything else in this group sits on. A coursed masonry wall: horizontal " +
    "COURSES of stones, each course offset half a stone from the one below so no vertical joint runs " +
    "through — a RUNNING BOND, the same rule the plank floor's stagger comes from, and for the same " +
    "reason. Drag Bond to 0 and the joints stack into a grid, which is STACK BOND: real, but it reads as " +
    "tiling rather than masonry because nothing is bonded to anything. Joint is the mortar line; take it " +
    "to zero and the course fuses into a slab, which is what a wall seen from across a courtyard actually " +
    "is — flat, until something stands proud of it. That is the next study.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  COURSE        one horizontal row of stones. Masonry is built in courses, not columns.
//  BOND          how the vertical joints are staggered between courses. RUNNING BOND offsets each course
//                half a stone; STACK BOND does not offset at all and is structurally worthless.
//  PERPEND       the vertical joint between two stones in a course. The thing a bond exists to break up.
//  BED JOINT     the horizontal joint between courses.
//  CLOSER        the short stone that finishes a course where a whole one will not fit.
//  ASHLAR        squared, dressed stone in courses of EQUAL height. Course Variance at 0.
//  RANDOM        coursed masonry whose courses differ in height but are each still level. Course Variance
//  COURSED       above 0. These two name the RESULT; the variance is the control that moves between them.
//  QUOIN         the dressed corner stone. Its own study.

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x14161c,
    cameraPosition: [2.6, 2.4, 4.2],
  });

  controls.target.set(0, 1.4, 0);
  controls.update();

  const key = new DirectionalLight(0xfff2e2, 1.45);
  key.position.set(2.5, 3.5, 3);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-2.5, 0.5, -2);
  scene.add(key, bounce);

  const stone = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    width: 3.2,
    height: 3,
    thickness: 0.34,
    courseHeight: 0.26,
    stoneAspect: 2.2,
    // The three variance axes. LENGTH and DEPTH vary per STONE; COURSE varies per COURSE, because a
    // course that is not level is not a course.
    lengthVariance: 0.22,
    courseVariance: 0,
    joint: 0.012,
    mortar: true,
    mortarRecess: 0.014,
    mortarColor: "#b8b2a6",
    bondOffset: 0.5,
    shortestStone: 0.45,
    depthVariance: 0.006,
    settle: 0,
    tilt: 0,
    proudChance: 0.12,
    proudDepth: 0.03,
    stoneColor: "#6a6560",
    colorVariance: 0.07,
    seed: 0x2c1a,
    wireframe: false,
    readout: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear();

    const random = mulberry32(params.seed);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    const base = new Color(params.stoneColor);
    const tint = new Color();

    // Courses are fitted to the wall's height, so the top one is never a sliver. The height asked for is a
    // target; the height laid is exactly the wall's.
    const courses = Math.max(1, Math.round(params.height / params.courseHeight));

    // COURSE HEIGHTS. Varying ACROSS courses and never within one — a course that is not level is not a
    // course. Uniform is ASHLAR; varied is RANDOM COURSED, and both are real.
    //
    // They must still sum to the wall exactly, so this is slack absorption again: jitter every course,
    // then normalise the set. Jittering them independently and hoping would leave a remainder at the top,
    // which is the runt problem standing on its end.
    const weights = Array.from({ length: courses }, () => 1 + signed(params.courseVariance));
    const weightTotal = weights.reduce((sum, w) => sum + w, 0);
    const heights = weights.map((w) => (w / weightTotal) * params.height);

    const stones: BufferGeometry[] = [];
    let closers = 0;
    let proud = 0;

    let below = 0;
    for (let c = 0; c < courses; c++) {
      const course = heights[c]!;
      // A taller course carries proportionally longer stones — the aspect is the stone's, not the wall's.
      const nominal = course * params.stoneAspect;
      const y = below + course / 2;
      below += course;
      // The bond: alternate courses start part-way along a stone, so the perpends never line up. Half a
      // stone is the classic; anything else is a named bond of its own.
      const offset = (c % 2) * nominal * params.bondOffset;
      // A course starts with a CLOSER — the short stone that takes up the offset — rather than hanging the
      // first whole stone off the corner.
      let x = 0;

      // The shortest stone worth cutting. Everything else is measured against it, and it is the ONLY
      // reason a course ever ends on something other than a full stone.
      const shortest = nominal * params.shortestStone;

      while (x < params.width - 1e-6) {
        const remaining = params.width - x;
        const wanted = c % 2 === 1 && x === 0 && offset > 1e-6
          ? Math.max(offset, shortest)
          : nominal * (1 + signed(params.lengthVariance));

        let length = Math.min(Math.max(wanted, shortest), remaining);
        // NO RUNT — the same rule `layPlankFloor` lays floors by, and it belongs to LAYING rather than to
        // floors. If putting this stone in would strand a remainder too short to cut, take the remainder
        // now and finish the course. Without it the last stone is simply whatever is left: sometimes a
        // sliver, and sometimes so little that the course gives up and stops short of the edge.
        if (remaining - length < shortest) length = remaining;
        if (length < nominal * 0.75) closers++;

        // The joint is taken OUT of the stone, so the coursing keeps its pitch as the mortar widens.
        const cut = Math.max(length - params.joint, course * 0.15);

        // DEPTH. Every stone sits a little in or out — no mason lands them all on one plane — and a few
        // stand notably PROUD. Both are the same number, which is why they are one mechanism here.
        //
        // The stone is GROWN or SHRUNK rather than moved, so its BACK stays flush. Sliding it would open
        // a hole at the back of the wall for every stone pushed out, which the through-joints would then
        // show you. A faced wall varies on the face it is faced on.
        //
        // Note this is a different mechanism from the Proud Stones study. There the surface is one slab
        // and blocks are ADDED to it; here every stone is already its own block, so it simply changes
        // depth. Adding is for surfaces you cannot take apart; this wall you can.
        let out = signed(params.depthVariance);
        if (random() < params.proudChance) {
          out += params.proudDepth * (0.7 + random() * 0.9);
          proud++;
        }
        const depth = Math.max(course * 0.15, params.thickness + out);

        const block = new BoxGeometry(cut, course - params.joint, depth);
        // SETTLE and TILT — displacement rather than size, and the two knobs that take this from a wall
        // that was built to one that has been standing a while. Rotate about the stone's own centre first,
        // then move it, or the tilt would swing it about the wall's origin instead.
        //
        // Deliberately not masonry truth: real stones do not sit like this. It is a stylised, decrepit
        // read, and it works here rather than on a bare stack because the mortar core is behind every gap
        // it opens — the wall goes crooked without going see-through. Both default to 0.
        if (params.tilt > 0) {
          block.rotateX(signed(params.tilt));
          block.rotateY(signed(params.tilt));
          block.rotateZ(signed(params.tilt));
        }
        block.translate(
          x + length / 2 + signed(params.settle),
          y + signed(params.settle),
          (depth - params.thickness) / 2 + signed(params.settle),
        );

        tint
          .copy(base)
          .offsetHSL(signed(params.colorVariance) / 4, signed(params.colorVariance) / 2, signed(params.colorVariance));
        const count = block.attributes.position!.count;
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          colors[i * 3] = tint.r;
          colors[i * 3 + 1] = tint.g;
          colors[i * 3 + 2] = tint.b;
        }
        block.setAttribute("color", new BufferAttribute(colors, 3));
        stones.push(block);

        x += length;
      }
    }

    // THE MORTAR. One box behind everything, recessed from both faces.
    //
    // Without it the joints are holes: at a hairline they read as shadow, but open the joint up and you
    // can see daylight through the wall. A mortared wall is stones BEDDED IN A CORE and standing proud of
    // it, so the honest fix is the core itself — and it costs one box, painted with the same vertex
    // colours as everything else, so the wall is still one draw call.
    //
    // Recessed rather than flush, because a joint filled level with the face has no shadow and reads as a
    // painted line. Raked back, it reads as a joint. That recess is the whole difference.
    if (params.mortar) {
      const core = new BoxGeometry(
        params.width,
        params.height,
        Math.max(params.thickness * 0.15, params.thickness - params.mortarRecess * 2),
      );
      core.translate(params.width / 2, params.height / 2, 0);
      const fill = new Color(params.mortarColor);
      const count = core.attributes.position!.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = fill.r;
        colors[i * 3 + 1] = fill.g;
        colors[i * 3 + 2] = fill.b;
      }
      core.setAttribute("color", new BufferAttribute(colors, 3));
      stones.push(core);
    }

    // Centred on X, foot on y = 0 — the resting frame everything here uses.
    const merged = mergeGeometries(stones, false);
    stones.forEach((part) => part.dispose());
    if (!merged) return;
    merged.translate(-params.width / 2, 0, 0);

    stage.add(new Mesh(merged, stone));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(merged), wire));

    const tris = merged.getAttribute("position").count / 3;
    params.readout = `${stones.length} stones · ${courses} courses · ${closers} closers · ${proud} proud · ${tris.toLocaleString()} tris · 1 draw call`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Stone Wall");

  const wall = gui.addFolder("Wall");
  wall.add(params, "width", 1, 8, 0.1).name("Width").onChange(rebuild);
  wall.add(params, "height", 0.5, 8, 0.1).name("Height").onChange(rebuild);
  wall.add(params, "thickness", 0.08, 1, 0.02).name("Thickness").onChange(rebuild);
  wall.open();

  // CEILINGS. Seven variance controls that SUM, where the brick wall has three — so each one's ceiling is
  // set lower than it could bear alone. Each is roughly twice where it starts fighting something real:
  // tilt reaches through the mortar recess at 0.038, settle sinks behind the core face at 0.014, course
  // variance passes a 2:1 tallest-to-shortest at 0.365. Twice that leaves the stylised extreme reachable
  // without the wall coming apart.
  //
  // Length Variance is the exception and caps BELOW its limit: past 0.55 the Shortest Stone floor starts
  // clipping its low tail, and a slider that keeps moving after it has stopped doing anything is a lie.
  const coursing = gui.addFolder("Coursing");
  // Courses are fitted to the height, so this is a target — the readout reports what was laid.
  coursing.add(params, "courseHeight", 0.08, 0.8, 0.01).name("Course Height").onChange(rebuild);
  // Length as a multiple of the course. 2.2 is a normal ashlar block; 1 is a cube; 4 is a long stretcher.
  coursing.add(params, "stoneAspect", 0.6, 5, 0.1).name("Stone Aspect").onChange(rebuild);
  // Per COURSE, not per stone — a course that is not level is not a course. 0 is ASHLAR, every course the
  // same height; above it is RANDOM COURSED. The variance is the control; those are the results.
  coursing.add(params, "courseVariance", 0, 0.45, 0.01).name("Course Variance").onChange(rebuild);
  coursing.add(params, "lengthVariance", 0, 0.5, 0.02).name("Length Variance").onChange(rebuild);
  // The shortest stone worth cutting, as a fraction of a nominal one. THE control that decides how a
  // course ends: raise it and closers get chunkier because the stone before absorbs more.
  coursing.add(params, "shortestStone", 0.15, 1, 0.05).name("Shortest Stone").onChange(rebuild);
  coursing.open();

  const mortar = gui.addFolder("Mortar");
  // Off is a DRY STONE wall — stones stacked and cut to fit, joints open all the way through. On beds
  // them in a core, which is what a mortared wall actually is.
  mortar.add(params, "mortar").name("Mortar").onChange(rebuild);
  // How far the core sits BEHIND the stone faces. Flush has no shadow and reads as a painted line; raked
  // back, the joint reads as a joint.
  mortar.add(params, "mortarRecess", 0, 0.08, 0.002).name("Mortar Recess").onChange(rebuild);
  mortar.addColor(params, "mortarColor").name("Mortar Color").onChange(rebuild);
  mortar.open();

  const laid = gui.addFolder("Laid");
  // How far each stone strays from its bed. Displacement, not size — the three Variance controls change
  // a stone's dimensions; these two change where it ended up.
  laid.add(params, "settle", 0, 0.03, 0.001).name("Settle").onChange(rebuild);
  laid.add(params, "tilt", 0, 0.08, 0.002).name("Tilt").onChange(rebuild);
  laid.open();

  const relief = gui.addFolder("Relief");
  // The third axis. Every stone a little in or out — no mason lands them all on one plane, and this is
  // what stops the face reading as a single flat sheet with lines drawn on it.
  relief.add(params, "depthVariance", 0, 0.035, 0.001).name("Depth Variance").onChange(rebuild);
  // And a few that stand notably out. Chance per stone, so density is independent of how many stones
  // the wall happens to need.
  relief.add(params, "proudChance", 0, 1, 0.01).name("Proud Chance").onChange(rebuild);
  relief.add(params, "proudDepth", 0, 0.1, 0.002).name("Proud Depth").onChange(rebuild);
  coursing.add(params, "joint", 0, 0.06, 0.002).name("Joint (mortar)").onChange(rebuild);
  // 0.5 is a running bond. 0 is a STACK bond — the joints line up and it stops reading as masonry.
  coursing.add(params, "bondOffset", 0, 1, 0.05).name("Bond Offset").onChange(rebuild);
  coursing.open();

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "stoneColor").name("Stone Color").onChange(rebuild);
  // Mostly lightness, a little saturation, barely any hue — stone varies in depth, not species.
  colour.add(params, "colorVariance", 0, 0.3, 0.005).name("Color Variance").onChange(rebuild);
  colour.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Readout").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    wire.dispose();
    dispose();
  };
}
