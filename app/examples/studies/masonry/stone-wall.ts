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
//  ASHLAR        squared, dressed stone laid in regular courses — what this is. RUBBLE is the opposite.
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
    joint: 0.012,
    bond: 0.5,
    lengthJitter: 0.22,
    color: "#6a6560",
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
    const base = new Color(params.color);
    const tint = new Color();

    // Courses are fitted to the wall's height, so the top one is never a sliver. The height asked for is a
    // target; the height laid is `courses * course`.
    const courses = Math.max(1, Math.round(params.height / params.courseHeight));
    const course = params.height / courses;
    const nominal = course * params.stoneAspect;

    const stones: BufferGeometry[] = [];
    let closers = 0;

    for (let c = 0; c < courses; c++) {
      const y = (c + 0.5) * course;
      // The bond: alternate courses start part-way along a stone, so the perpends never line up. Half a
      // stone is the classic; anything else is a named bond of its own.
      const offset = (c % 2) * nominal * params.bond;
      // A course starts with a CLOSER — the short stone that takes up the offset — rather than hanging the
      // first whole stone off the corner.
      let x = 0;

      while (x < params.width - 1e-6) {
        const wanted = c % 2 === 1 && x === 0 && offset > 1e-6
          ? offset
          : nominal * (1 + signed(params.lengthJitter));
        const length = Math.min(Math.max(wanted, course * 0.35), params.width - x);
        if (length < course * 0.2) break;
        if (length < nominal * 0.5) closers++;

        // The joint is taken OUT of the stone, so the coursing keeps its pitch as the mortar widens.
        const cut = Math.max(length - params.joint, course * 0.15);
        const block = new BoxGeometry(cut, course - params.joint, params.thickness);
        block.translate(x + length / 2, y, 0);

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

    // Centred on X, foot on y = 0 — the resting frame everything here uses.
    const merged = mergeGeometries(stones, false);
    stones.forEach((part) => part.dispose());
    if (!merged) return;
    merged.translate(-params.width / 2, 0, 0);

    stage.add(new Mesh(merged, stone));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(merged), wire));

    const tris = merged.getAttribute("position").count / 3;
    params.readout = `${stones.length} stones · ${courses} courses of ${course.toFixed(4)} · ${closers} closers · ${tris.toLocaleString()} tris · 1 draw call`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Stone Wall");

  const wall = gui.addFolder("Wall");
  wall.add(params, "width", 1, 8, 0.1).name("Width").onChange(rebuild);
  wall.add(params, "height", 0.5, 8, 0.1).name("Height").onChange(rebuild);
  wall.add(params, "thickness", 0.08, 1, 0.02).name("Thickness").onChange(rebuild);
  wall.open();

  const coursing = gui.addFolder("Coursing");
  // Courses are fitted to the height, so this is a target — the readout reports what was laid.
  coursing.add(params, "courseHeight", 0.08, 0.8, 0.01).name("Course Height").onChange(rebuild);
  // Length as a multiple of the course. 2.2 is a normal ashlar block; 1 is a cube; 4 is a long stretcher.
  coursing.add(params, "stoneAspect", 0.6, 5, 0.1).name("Stone Aspect").onChange(rebuild);
  coursing.add(params, "lengthJitter", 0, 0.6, 0.02).name("Length Variance").onChange(rebuild);
  coursing.add(params, "joint", 0, 0.06, 0.002).name("Joint (mortar)").onChange(rebuild);
  // 0.5 is a running bond. 0 is a STACK bond — the joints line up and it stops reading as masonry.
  coursing.add(params, "bond", 0, 1, 0.05).name("Bond Offset").onChange(rebuild);
  coursing.open();

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "color").name("Stone").onChange(rebuild);
  // Mostly lightness, a little saturation, barely any hue — stone varies in depth, not species.
  colour.add(params, "colorVariance", 0, 0.3, 0.005).name("Variance").onChange(rebuild);
  colour.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Laid").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    wire.dispose();
    dispose();
  };
}
