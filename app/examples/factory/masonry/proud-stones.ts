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
import { mulberry32, scatterProudStones } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Proud Stones",
  description:
    "The thing that turns a flat face into masonry, and it is a SURFACE operation: it needs a " +
    "rectangle and a course grid, and never needs to know it is a wall. The move that makes it work is " +
    "that a proud stone is a HALF-EMBEDDED block, not a block sitting on the face — it is sunk further " +
    "into the surface than it stands out of it, so nothing floats, no two faces are coplanar, and it " +
    "inherits the bond for free. Turn Sink to zero and watch it become a sticker: the silhouette is the " +
    "same but the shadow at its foot goes wrong. Everything else is variance around a nominal — length, " +
    "height, depth and a whisper of tilt, each a multiplier rather than an absolute, so one setting works " +
    "at any scale. Density is a CHANCE per cell, so the grid stays regular while the result does not. " +
    "This is ACCENT, not a brick simulation — a hand-drawn wall never draws every stone, it draws a few " +
    "proud ones and lets you infer the rest. Tight Length and Height ranges give you BRICK, where every " +
    "unit is the same and one has simply popped; wide ranges give you molded STONE. The two presets set " +
    "nothing but those ranges.",
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
//  BATTER       a wall's backward lean. Not modeled; would tilt the whole surface, not the stones.

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
    bondOffset: 0.5,
    density: 0.14,
    lengthMin: 0.72,
    lengthMax: 1.12,
    heightMin: 0.8,
    heightMax: 0.92,
    depthMin: 0.024,
    depthMax: 0.056,
    stoneWidth: 0.17,
    tilt: 0.025,
    bothSides: true,
    stoneColor: "#6a6560",
    colorVariance: 0.09,
    seed: 0x2c1a,
    showSurface: true,
    window: false,
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

    const { placements, candidates, excluded } = scatterProudStones({
      width: params.width,
      height: params.height,
      courseHeight: params.courseHeight,
      stoneAspect: params.stoneAspect,
      bondOffset: params.bondOffset,
      density: params.density,
      lengthMin: params.lengthMin,
      lengthMax: params.lengthMax,
      heightMin: params.heightMin,
      heightMax: params.heightMax,
      depthMin: params.depthMin,
      depthMax: params.depthMax,
      tilt: params.tilt,
      seed: params.seed,
      // Composition, handed in rather than known about — a window the stones must keep off.
      exclusions: params.window ? [{ x: params.width * 0.34, y: params.height * 0.3, width: params.width * 0.28, height: params.height * 0.42 }] : [],
    });

    const random = mulberry32(params.seed ^ 0x9e3779b9);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    const base = new Color(params.stoneColor);
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
      // THE MOVE. The block runs `stoneWidth` INTO the surface and sits so that exactly `depth` of it
      // clears the face — the rest is buried. Sunk further than it stands out, so the join at its foot is
      // inside solid material rather than on it.
      //
      // Width is given, not derived. The original took `wallThickness * 0.5`, which is self-limiting —
      // half a wall can never reach the other half — but a surface operation does not know the wall, so
      // the caller states it and both ends are guarded instead:
      //
      //   TOO THIN — the block's back face rises to meet the surface's FRONT face, and two coplanar
      //     surfaces fight.
      //   TOO THICK — with both faces built, a block from one side grows past the midplane and meets its
      //     opposite number, two differently-tinted solids sharing space. That is the color shimmer.
      const floor = depth + params.surfaceThickness * 0.12;
      const ceiling = Math.max(floor, half + depth - params.surfaceThickness * 0.08);
      const wanted = params.stoneWidth;
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
    params.readout = `${placements.length} of ${candidates} cells (${excluded} excluded) (${((placements.length / Math.max(1, candidates)) * 100).toFixed(0)}%) × ${faces} face${faces > 1 ? "s" : ""} · ${tris.toLocaleString()} tris · 1 draw call`;
    params.clampOut =
      clamped === 0
        ? "none — every stone got the width asked for"
        : `${clamped} clamped — ${params.stoneWidth > half ? "would breach the midplane" : "would sit coplanar with the face"}`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Proud Stones");

  const surface = gui.addFolder("Surface");
  surface.add(params, "width", 1, 8, 0.1).name("Width").onChange(rebuild);
  surface.add(params, "height", 0.5, 8, 0.1).name("Height").onChange(rebuild);
  surface.add(params, "surfaceThickness", 0.06, 1, 0.02).name("Surface Thickness").onChange(rebuild);
  surface.add(params, "showSurface").name("Show Surface").onChange(rebuild);
  // EXCLUSIONS are what keep this a surface operation. The scatter never learns what a window is; it is
  // handed a rectangle to stay off, and composes with anything the same way.
  surface.add(params, "window").name("Window (exclusion)").onChange(rebuild);
  surface.open();

  const grid = gui.addFolder("Course Grid");
  // The stones need the grid the WALL is built on, or they land across joints instead of on stones.
  grid.add(params, "courseHeight", 0.08, 0.8, 0.01).name("Course Height").onChange(rebuild);
  grid.add(params, "stoneAspect", 0.6, 5, 0.1).name("Stone Aspect").onChange(rebuild);
  grid.add(params, "bondOffset", 0, 1, 0.05).name("Bond Offset").onChange(rebuild);
  grid.open();

  const proud = gui.addFolder("Proud");
  // A chance PER CELL, not a count — the grid stays regular and the result does not clump.
  proud.add(params, "density", 0, 1, 0.01).name("Density").onChange(rebuild);
  // How far it stands out of the face. A RANGE: identical values give every stone the same relief.
  proud.add(params, "depthMin", 0.002, 0.15, 0.002).name("Depth Min").onChange(rebuild);
  proud.add(params, "depthMax", 0.002, 0.15, 0.002).name("Depth Max").onChange(rebuild);
  // How far it runs INTO the surface. Given, not derived — see the note at the geometry.
  proud.add(params, "stoneWidth", 0.01, 1, 0.005).name("Stone Width").onChange(rebuild);
  proud.add(params, "tilt", 0, 0.12, 0.002).name("Tilt").onChange(rebuild);
  // A facade shows both faces; a surface let into something only shows one.
  proud.add(params, "bothSides").name("Both Sides").onChange(rebuild);
  proud.open();

  const size = gui.addFolder("Stone Size");
  // THE brick/stone dial. Multiples of the nominal stone and of the course, so they hold at any scale.
  // Collapse a range and every proud stone is the same unit; open it and each came from its own mold.
  size.add(params, "lengthMin", 0.2, 2, 0.02).name("Length Min").onChange(rebuild);
  size.add(params, "lengthMax", 0.2, 2, 0.02).name("Length Max").onChange(rebuild);
  size.add(params, "heightMin", 0.2, 1.2, 0.02).name("Height Min").onChange(rebuild);
  size.add(params, "heightMax", 0.2, 1.2, 0.02).name("Height Max").onChange(rebuild);
  size
    .add(
      {
        brick: () => {
          // Every unit identical, one has simply popped. Shallow, square, and barely rolled.
          Object.assign(params, {
            lengthMin: 1, lengthMax: 1, heightMin: 0.94, heightMax: 0.94,
            depthMin: 0.022, depthMax: 0.03, tilt: 0.004, density: 0.09,
          });
          gui.controllersRecursive().forEach((c) => c.updateDisplay());
          rebuild();
        },
      },
      "brick",
    )
    .name("Preset: Brick");
  size
    .add(
      {
        stone: () => {
          // Each from its own mold. Wide on every axis, and rolled enough to catch the light unevenly.
          Object.assign(params, {
            lengthMin: 0.55, lengthMax: 1.35, heightMin: 0.68, heightMax: 0.98,
            depthMin: 0.018, depthMax: 0.07, tilt: 0.03, density: 0.16,
          });
          gui.controllersRecursive().forEach((c) => c.updateDisplay());
          rebuild();
        },
      },
      "stone",
    )
    .name("Preset: Stone");
  size.open();

  const color = gui.addFolder("Color");
  color.addColor(params, "stoneColor").name("Stone Color").onChange(rebuild);
  color.add(params, "colorVariance", 0, 0.35, 0.005).name("Color Variance").onChange(rebuild);
  color.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Readout").listen().disable();
  readout.add(params, "clampOut").name("Clamp").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    wire.dispose();
    dispose();
  };
}
