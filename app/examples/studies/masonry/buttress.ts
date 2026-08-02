import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Shape,
  WireframeGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Buttress",
  description:
    "STUDY — first iteration, and about the FORM rather than the join. A buttress is a mass projecting " +
    "from a wall to take the thrust the wall cannot, and its shape follows from two things. It is deepest " +
    "at the bottom, because that is where the thrust has accumulated — so it SETS OFF, stepping back in " +
    "STAGES as it rises. And every set-off is WEATHERED, sloped so water runs off rather than sitting on a " +
    "ledge and freezing the stone apart. Take Weathering to 0 and watch the set-offs become shelves: still " +
    "a buttress, and one that would not last a winter. " +
    "It is built as ONE extruded elevation rather than a stack of boxes — draw the silhouette once, extrude " +
    "it along the wall, and the stages and their weatherings all fall out of a single closed profile. " +
    "The back is deliberately EMBEDDED in the wall: a buttress that merely touches would put two coplanar " +
    "faces together, and that is the same lesson the corner assembly study is still chewing on.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  BUTTRESS     a mass projecting from a wall to resist lateral thrust. Deepest at the base, because that
//               is where the thrust has gathered.
//  STAGE        one step of a buttress. A tall one has three or four.
//  SET-OFF      where it steps back. Also called an OFFSET.
//  WEATHERING   the slope on a set-off, so water runs off it. Not ornament — a flat ledge holds water,
//               water freezes, and freezing stone splits. Every horizontal surface outdoors is weathered.
//  PLINTH       the wider base course the whole thing stands on.
//  PILASTER     a shallow buttress, more articulation than structure. Barely projects.
//  BUTTRESS
//
//  At a CORNER there are four classic answers, and they are the next iteration:
//    CLASPING   one mass wrapping the corner entirely
//    ANGLE      two, one on each face, meeting at the corner
//    DIAGONAL   one, set on the 45 degree bisector
//    SETBACK    two, set back from the corner rather than meeting it
//
//  FLYING       an arch carrying thrust across open air to a detached PIER. A different animal: the arch
//  BUTTRESS     is the structure and the pier is the buttress. Later, if at all.

/**
 * The buttress's ELEVATION — its silhouette seen from the side, as a closed profile.
 *
 * Built once and extruded, rather than stacked as boxes. A stack needs every box and every wedge placed
 * and kept in agreement; a profile makes the stages and their weatherings a consequence of walking one
 * outline, and the two can never disagree because they are the same polygon.
 *
 * `x` runs OUT from the wall face, `y` runs UP from the ground.
 */
const elevation = (
  stages: number,
  height: number,
  baseProjection: number,
  topProjection: number,
  weathering: number,
  embed: number,
): Shape => {
  const count = Math.max(1, Math.round(stages));
  // Each stage is a vertical face plus the weathering above it. The faces share what is left.
  const stageHeight = height / count;
  const faceHeight = Math.max(stageHeight * 0.15, stageHeight - weathering);

  const projectionAt = (i: number) =>
    count === 1 ? baseProjection : baseProjection + (topProjection - baseProjection) * (i / (count - 1));

  const shape = new Shape();
  // Start INSIDE the wall. A buttress whose back is flush with the wall face puts two coplanar surfaces
  // together; buried, there is nothing to fight and the joint is solid material.
  shape.moveTo(-embed, 0);
  shape.lineTo(projectionAt(0), 0);

  let y = 0;
  for (let i = 0; i < count; i++) {
    const out = projectionAt(i);
    y += faceHeight;
    shape.lineTo(out, y);

    // The weathering: in and up to the next stage's face, or back to the wall for the last one, which is
    // what caps the buttress and sheds its water into the wall rather than off the front.
    const next = i === count - 1 ? -embed : projectionAt(i + 1);
    y += weathering;
    shape.lineTo(next, y);
  }

  shape.lineTo(-embed, 0);
  return shape;
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x14161c,
    cameraPosition: [4.6, 3.0, 5.2],
  });

  controls.target.set(0, 1.5, 0);
  controls.update();

  const key = new DirectionalLight(0xfff2e2, 1.45);
  // Low and raking across the face, so every set-off throws its own shadow.
  key.position.set(3.5, 2.8, 3);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-3, 0.5, -2);
  scene.add(key, bounce);

  const stone = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  const render = new MeshStandardMaterial({ color: 0x5f5a54, roughness: 1, flatShading: true });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    wallLength: 6,
    wallHeight: 4,
    wallThickness: 0.4,

    count: 3,
    stages: 3,
    width: 0.7,
    height: 3.2,
    baseProjection: 0.9,
    topProjection: 0.3,
    weathering: 0.12,
    embed: 0.12,

    color: "#7e776c",
    colorVariance: 0.05,
    seed: 0x2c1a,

    wireframe: false,
    laid: "",
    slope: "",
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

    const { wallLength: L, wallHeight: H, wallThickness: T } = params;
    const wall = new Mesh(new BoxGeometry(L, H, T), render);
    wall.position.y = H / 2;
    stage.add(wall);

    const shape = elevation(
      params.stages,
      params.height,
      params.baseProjection,
      params.topProjection,
      params.weathering,
      params.embed,
    );

    const random = mulberry32(params.seed);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    const base = new Color(params.color);
    const tint = new Color();
    const parts: BufferGeometry[] = [];

    const count = Math.max(1, Math.round(params.count));
    for (let i = 0; i < count; i++) {
      const geometry = new ExtrudeGeometry(shape, {
        depth: params.width,
        bevelEnabled: false,
        curveSegments: 1,
      });
      // Drawn in the elevation plane (x out from the wall, y up) and extruded along its own +Z, so a
      // quarter turn lays the extrusion along the wall and swings the projection out to +Z.
      geometry.rotateY(-Math.PI / 2);
      // `rotateY(-90°)` sends the extrusion to −X, so translate by its own width to put the block's near
      // edge at the position asked for rather than its far edge.
      const x = count === 1 ? 0 : -L / 2 + ((i + 0.5) / count) * L;
      geometry.translate(x + params.width / 2, 0, T / 2);

      tint
        .copy(base)
        .offsetHSL(signed(params.colorVariance) / 4, signed(params.colorVariance) / 2, signed(params.colorVariance));
      const verts = geometry.attributes.position!.count;
      const colors = new Float32Array(verts * 3);
      for (let v = 0; v < verts; v++) {
        colors[v * 3] = tint.r;
        colors[v * 3 + 1] = tint.g;
        colors[v * 3 + 2] = tint.b;
      }
      geometry.setAttribute("color", new BufferAttribute(colors, 3));
      parts.push(geometry);
    }

    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    if (merged) {
      stage.add(new Mesh(merged, stone));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(merged), wire));
    }

    // The set-off's slope, as an angle. Under about 20° water sits; a real weathering is steeper.
    const setback =
      params.stages > 1
        ? (params.baseProjection - params.topProjection) / (params.stages - 1)
        : params.baseProjection + params.embed;
    const angle = (Math.atan2(params.weathering, Math.max(setback, 1e-6)) * 180) / Math.PI;
    params.laid = `${count} buttresses · ${Math.round(params.stages)} stages · projects ${params.baseProjection.toFixed(2)} → ${params.topProjection.toFixed(2)}`;
    params.slope = `set-off ${setback.toFixed(3)} · weathering ${angle.toFixed(0)}° ${angle < 20 ? "— too shallow, water would sit" : "— sheds"}`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Buttress");

  const form = gui.addFolder("Buttress");
  form.add(params, "stages", 1, 6, 1).name("Stages").onChange(rebuild);
  form.add(params, "height", 0.5, 6, 0.1).name("Height").onChange(rebuild);
  form.add(params, "width", 0.2, 2, 0.05).name("Width").onChange(rebuild);
  // Deepest at the base, because that is where the thrust has gathered.
  form.add(params, "baseProjection", 0.1, 2, 0.05).name("Base Projection").onChange(rebuild);
  form.add(params, "topProjection", 0.05, 2, 0.05).name("Top Projection").onChange(rebuild);
  // NOT ornament. A flat set-off holds water, water freezes, freezing stone splits. Take it to 0 and the
  // set-offs become shelves — still a buttress, and one that would not last a winter.
  form.add(params, "weathering", 0, 0.5, 0.01).name("Weathering").onChange(rebuild);
  // How far the back is buried in the wall. Flush would put two coplanar faces together.
  form.add(params, "embed", 0.01, 0.4, 0.01).name("Embed").onChange(rebuild);
  form.open();

  const wall = gui.addFolder("Wall");
  wall.add(params, "count", 1, 8, 1).name("Count").onChange(rebuild);
  wall.add(params, "wallLength", 1, 14, 0.5).name("Wall Length").onChange(rebuild);
  wall.add(params, "wallHeight", 1, 8, 0.1).name("Wall Height").onChange(rebuild);
  wall.add(params, "wallThickness", 0.1, 1, 0.05).name("Wall Thickness").onChange(rebuild);
  wall.open();

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "color").name("Color").onChange(rebuild);
  colour.add(params, "colorVariance", 0, 0.25, 0.005).name("Color Variance").onChange(rebuild);
  colour.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "laid").name("Laid").listen().disable();
  readout.add(params, "slope").name("Slope").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    render.dispose();
    wire.dispose();
    dispose();
  };
}
