import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
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
  title: "Proud Stones",
  description:
    "STUDY — the thing that turns a flat face into masonry, and it is a SURFACE operation: it needs a " +
    "rectangle and a course grid, and never needs to know it is a wall. The move that makes it work is " +
    "that a proud stone is a HALF-EMBEDDED block, not a block sitting on the face — it is sunk further " +
    "into the surface than it stands out of it, so nothing floats, no two faces are coplanar, and it " +
    "inherits the bond for free. Turn Sink to zero and watch it become a sticker: the silhouette is the " +
    "same but the shadow at its foot goes wrong. Everything else is variance around a nominal — length, " +
    "height, depth and a whisper of tilt, each a multiplier rather than an absolute, so one setting works " +
    "at any scale. Density is a CHANCE per cell, so the grid stays regular while the result does not.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  PROUD        standing forward of the surrounding surface. A mason's word, and the opposite of FLUSH.
//  SNECK        a small stone filling between larger ones. Not this — a sneck is IN the wall, not on it.
//  RUSTICATION  deliberately projecting, roughly-faced blocks, usually at a building's base. The
//               architectural version of this, done on purpose and to a pattern rather than at random.
//  BOSS         a projecting stone left for a carver to work later, sometimes never carved. The reason a
//               real wall has these at all.
//  BATTER       a wall's backward lean. Not modelled; would tilt the whole surface, not the stones.

interface Proud {
  /** Centre on the surface, from its lower-left corner. */
  x: number;
  y: number;
  length: number;
  height: number;
  /** How far it stands out of the surface. */
  depth: number;
  /** A whisper of roll, radians. */
  tilt: number;
}

/**
 * Where stones stand proud of a rectangle.
 *
 * **Takes a surface, not a wall.** A width, a height, and a course grid is everything it needs, which is
 * why the same call decorates a wall, a pier, a chimney or a plinth. Returns placements rather than
 * geometry, so the caller decides how far each one sinks and what it is made of.
 *
 * Every dimension is a MULTIPLIER on the course, never an absolute, so a single set of numbers reads the
 * same on a garden wall and on a bell tower.
 */
const scatterProud = (
  width: number,
  height: number,
  course: number,
  aspect: number,
  bond: number,
  chance: number,
  depth: number,
  tilt: number,
  seed: number,
): { placements: Proud[]; candidates: number } => {
  const random = mulberry32(seed);
  const signed = (amount: number) => (random() - 0.5) * 2 * amount;

  const courses = Math.max(1, Math.round(height / course));
  const step = height / courses;
  const nominal = step * aspect;

  const placements: Proud[] = [];
  let candidates = 0;

  for (let c = 0; c < courses; c++) {
    const y = (c + 0.5) * step;
    // The same running bond the wall itself uses, so a proud stone lands ON a stone rather than across a
    // perpend. This is the whole reason it must know the course grid and not merely the rectangle.
    const offset = (c % 2) * nominal * bond;

    for (let s = 0; ; s++) {
      const x = offset + s * nominal;
      if (x + nominal > width) break;
      candidates++;
      // Density is a CHANCE per cell, not a count. The grid stays regular; the result does not, and it
      // does not clump the way sampling positions at random would.
      if (random() > chance) continue;

      placements.push({
        x: x + nominal / 2,
        y: y + signed(step * 0.03),
        length: nominal * (0.72 + random() * 0.4),
        height: step * (0.8 + random() * 0.12),
        depth: depth * (0.7 + random() * 0.9),
        tilt: signed(tilt),
      });
    }
  }

  return { placements, candidates };
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x14161c,
    // Raking, and close. Proud stones are read by their shadows, which need a low light and a low eye.
    cameraPosition: [2.2, 1.7, 3.2],
  });

  controls.target.set(0, 1.2, 0);
  controls.update();

  const key = new DirectionalLight(0xfff2e2, 1.6);
  // Low and to one side, so every stone throws a shadow down the face. Overhead light hides all of this.
  key.position.set(3.5, 1.6, 2.2);
  const bounce = new DirectionalLight(0x8fa8c8, 0.35);
  bounce.position.set(-2.5, 0.5, -2);
  scene.add(key, bounce);

  const stone = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
    side: DoubleSide,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    width: 3.2,
    height: 2.6,
    surfaceThickness: 0.34,
    courseHeight: 0.26,
    stoneAspect: 2.2,
    bond: 0.5,
    chance: 0.14,
    depth: 0.035,
    sink: 2.6,
    tilt: 0.025,
    bothSides: true,
    color: "#6a6560",
    colorVariance: 0.09,
    seed: 0x2c1a,
    showSurface: true,
    wireframe: false,
    readout: "",
    clampOut: "",
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

    const { placements, candidates } = scatterProud(
      params.width,
      params.height,
      params.courseHeight,
      params.stoneAspect,
      params.bond,
      params.chance,
      params.depth,
      params.tilt,
      params.seed,
    );

    const random = mulberry32(params.seed ^ 0x9e3779b9);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    const base = new Color(params.color);
    const tint = new Color();

    const parts: BufferGeometry[] = [];
    const paint = (geometry: BufferGeometry, spread: number) => {
      tint
        .copy(base)
        .offsetHSL(signed(spread) / 4, signed(spread) / 2, signed(spread));
      const count = geometry.attributes.position!.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = tint.r;
        colors[i * 3 + 1] = tint.g;
        colors[i * 3 + 2] = tint.b;
      }
      geometry.setAttribute("color", new BufferAttribute(colors, 3));
      parts.push(geometry);
    };

    if (params.showSurface) {
      // The plain face the stones stand out of. Flat on purpose — this study is about what happens ON a
      // surface, so the surface itself is the least interesting thing here.
      const slab = new BoxGeometry(params.width, params.height, params.surfaceThickness);
      slab.translate(params.width / 2, params.height / 2, 0);
      paint(slab, params.colorVariance * 0.35);
    }

    const half = params.surfaceThickness / 2;
    let clamped = 0;
    for (const { x, y, length, height, depth, tilt } of placements) {
      // THE MOVE. The block is `depth * sink` deep and sits so that exactly `depth` of it clears the face —
      // the rest is buried. Sunk deeper than it stands out, so the join at its foot is inside solid
      // material rather than on it.
      //
      // Both ends need a guard, and neither is optional:
      //
      //   TOO SHALLOW — as the block's depth approaches `depth`, its inner face rises to meet the
      //     surface's OUTER face and the two land coplanar, which fights.
      //   TOO DEEP — a block from one face grows past the midplane and meets the block on the other,
      //     two differently-tinted solids sharing space. That is the colour shimmer, and it is why the
      //     original expressed this as a fixed fraction of the wall (`thickness * 0.5`) rather than a
      //     multiple of the projection: half a wall can never reach the other half.
      const floor = depth + params.surfaceThickness * 0.12;
      const ceiling = Math.max(floor, half + depth - params.surfaceThickness * 0.08);
      const wanted = depth * params.sink;
      const solid = Math.min(Math.max(wanted, floor), ceiling);
      if (Math.abs(solid - wanted) > 1e-9) clamped++;

      for (const side of params.bothSides ? [1, -1] : [1]) {
        const block = new BoxGeometry(length, height, solid);
        block.rotateZ(tilt);
        block.translate(x, y, side * (half + depth - solid / 2));
        paint(block, params.colorVariance);
      }
    }

    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    if (!merged) return;
    merged.translate(-params.width / 2, 0, 0);

    stage.add(new Mesh(merged, stone));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(merged), wire));

    const faces = params.bothSides ? 2 : 1;
    const tris = merged.getAttribute("position").count / 3;
    params.readout = `${placements.length} of ${candidates} cells (${((placements.length / Math.max(1, candidates)) * 100).toFixed(0)}%) × ${faces} face${faces > 1 ? "s" : ""} · ${tris.toLocaleString()} tris · 1 draw call`;
    params.clampOut =
      clamped === 0
        ? "none — every stone got the sink asked for"
        : `${clamped} stones clamped: sink would breach the ${clamped && params.sink > 2 ? "midplane" : "face"}`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Proud Stones");

  const surface = gui.addFolder("Surface");
  surface.add(params, "width", 1, 8, 0.1).name("Width").onChange(rebuild);
  surface.add(params, "height", 0.5, 8, 0.1).name("Height").onChange(rebuild);
  surface.add(params, "surfaceThickness", 0.06, 1, 0.02).name("Thickness").onChange(rebuild);
  surface.add(params, "showSurface").name("Show Surface").onChange(rebuild);
  surface.open();

  const grid = gui.addFolder("Course Grid");
  // The stones need the grid the WALL is built on, or they land across joints instead of on stones.
  grid.add(params, "courseHeight", 0.08, 0.8, 0.01).name("Course Height").onChange(rebuild);
  grid.add(params, "stoneAspect", 0.6, 5, 0.1).name("Stone Aspect").onChange(rebuild);
  grid.add(params, "bond", 0, 1, 0.05).name("Bond Offset").onChange(rebuild);
  grid.open();

  const proud = gui.addFolder("Proud");
  // A chance PER CELL, not a count — the grid stays regular and the result does not clump.
  proud.add(params, "chance", 0, 1, 0.01).name("Density (chance)").onChange(rebuild);
  proud.add(params, "depth", 0.002, 0.15, 0.002).name("Depth").onChange(rebuild);
  // How much deeper than it projects. 1 is flush-backed and starts to float; the default buries it well.
  proud.add(params, "sink", 1, 8, 0.1).name("Sink (× depth)").onChange(rebuild);
  proud.add(params, "tilt", 0, 0.12, 0.002).name("Tilt").onChange(rebuild);
  // A facade shows both faces; a surface let into something only shows one.
  proud.add(params, "bothSides").name("Both Faces").onChange(rebuild);
  proud.open();

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "color").name("Stone").onChange(rebuild);
  colour.add(params, "colorVariance", 0, 0.35, 0.005).name("Variance").onChange(rebuild);
  colour.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Placed").listen().disable();
  readout.add(params, "clampOut").name("Sink").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    wire.dispose();
    dispose();
  };
}
