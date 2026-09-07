import type { ExampleMeta, ExampleMount } from "../../../framework/example";
import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector3,
  WireframeGeometry,
} from "three";
import { MoldingGeometry } from "three-low-poly";
import { type MoldingStyle } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta: ExampleMeta = {
  title: "Corbel Run",
  description:
    "STUDY — the plainest possible bracket, and what makes a row of them read as ornament instead of as a " +
    "repeat. A corbel here is THREE POINTS: wide at the molding lip, tapering to nothing down the wall " +
    "face. No scroll, no profile, no curve — the Dentil Cornice has the classical modillion, and this is " +
    "the vernacular cousin that a stone corridor actually gets. The whole character comes from the " +
    "STAGGER: alternate brackets step further out and hang lower, so no two adjacent shadows start at the " +
    "same place, and a rank of identical triangles gains a rhythm it has no right to. Set both stagger " +
    "dials to zero and watch it collapse into wallpaper. The second finding is arithmetic: a run laid out " +
    "as `floor(length / spacing)` leaves its remainder entirely at ONE end, so the rank creeps off-center " +
    "as spacing changes — visible as soon as you can see both ends at once. Centering distributes the " +
    "remainder to both margins instead, which is the difference between a row of brackets and a row of " +
    "brackets that was measured.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  CORBEL     any bracket projecting from a wall to carry something above it. The structural word. A
//             MODILLION is the scrolled classical version, a CONSOLE an ornamental one taller than deep,
//             a MUTULE the flat Doric plate. This study is the undecorated case — the one you reach for
//             when the building is stone rather than marble.
//  CROWN      the molding the brackets appear to carry. Ornamentally they carry nothing; the run is
//             continuous and would stand without them.
//  STAGGER    alternating two states down a rank rather than repeating one. Depth stagger changes where
//             the shadow STARTS; height stagger changes where it ENDS.
//  PITCH      center to center. An output of the centering below, never the number you design with.
//  MARGIN     the gap between the end of the wall and the first bracket. The thing that gives when a run
//             does not divide evenly — and it must give at BOTH ends.

/**
 * The bracket. A right triangle in the wall's own axes: `x` projects out from the face, `y` runs down it.
 *
 * Extruded along z to give it width, then translated so the extrusion is CENTERED on its station — an
 * applied repeat places a center, so the geometry has to be built around one or every bracket sits half a
 * width late.
 */
const corbelShape = (projection: number, drop: number): Shape => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(projection, 0);
  shape.lineTo(0, -drop);
  shape.closePath();
  return shape;
};

/**
 * Bracket stations along a run, with the remainder split between the two ends.
 *
 * `floor(length / spacing)` answers HOW MANY fit; it does not answer where they go, and using its raw
 * result as an index from one margin is the bug this study calls out. The span the rank actually occupies
 * is `(count - 1) · pitch`, so what is left over is `length - that`, and half of it belongs at each end.
 *
 * `repeatAlongPath` solves the same problem for a path with corners — anchoring an item to every vertex
 * and letting the pitch give. A single straight wall has no corners to anchor to, so the slack has
 * nowhere to go but the margins, and the arithmetic is worth seeing bare.
 */
const stations = (length: number, spacing: number, endMargin: number, centered: boolean): number[] => {
  const usable = length - endMargin * 2;
  if (usable <= 0 || spacing <= 0) return [];
  const count = Math.floor(usable / spacing) + 1;
  const span = (count - 1) * spacing;
  // Centered: the remainder is halved and paid to both margins. Otherwise it all lands at the far end,
  // which is what the Hallway does — its rank sits 0.9 units off-center down a 22-unit corridor.
  const start = -length / 2 + endMargin + (centered ? (usable - span) / 2 : 0);
  return Array.from({ length: count }, (_, i) => start + i * spacing);
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, {
    background: 0x14171d,
    // FROM BELOW and to one side. A corbel is a soffit detail — seen from above, the stagger that is the
    // entire subject disappears behind the crown it hangs from.
    cameraPosition: [2.6, -0.6, 4.2],
  });
  const { scene, camera, dispose } = handle;

  // A long lens, for the same reason the other molding studies use one: the subject is a rank of shallow
  // shadow lines seen end-on, and that is precisely what perspective foreshortening destroys.
  camera.fov = 26;
  camera.near = 0.01;
  camera.updateProjectionMatrix();

  // Raking, and across the run rather than down it — a bracket is only as good as the shadow it throws,
  // and a light square to the wall throws none.
  const key = new DirectionalLight(0xfff2e2, 1.35);
  key.position.set(2.2, 1.6, 1.4);
  const bounce = new DirectionalLight(0x93a9c8, 0.45);
  bounce.position.set(-1.4, -0.6, 0.9);
  scene.add(key, bounce);

  const params = {
    wallLength: 7,
    wallHeight: 2.6,
    wallThickness: 0.3,

    style: "ogee" as MoldingStyle,
    crownDrop: 0.2,
    crownProjection: 0.24,
    segments: 6,

    corbels: true,
    spacing: 1,
    projection: 0.22,
    drop: 0.62,
    width: 0.14,
    endMargin: 0.8,
    centered: true,

    // THE dials. Both to zero and the rank reads as wallpaper.
    depthStagger: 0.07,
    heightStagger: 0.06,

    wireframe: false,
    laid: "",
    offset: "",
  };

  const stone = new MeshStandardMaterial({ color: 0x8f96a1, roughness: 1, flatShading: true });
  const crownStone = new MeshStandardMaterial({
    color: 0x5d636e,
    roughness: 0.95,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  // Deliberately LIGHTER than the crown it hangs under. The Hallway had this the other way round, and a
  // bracket darker than its own soffit reads as a hole rather than as a solid.
  const bracketStone = new MeshStandardMaterial({ color: 0xa8aeb8, roughness: 0.98, flatShading: true });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    const seen = new Set<BufferGeometry>();
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        seen.add(child.geometry);
        stage.remove(child);
      }
    }
    for (const geometry of seen) geometry.dispose();
  };

  const add = (geometry: BufferGeometry, material: MeshStandardMaterial) => {
    stage.add(new Mesh(geometry, material));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));
  };

  const rebuild = () => {
    clear();

    const half = params.wallLength / 2;
    // The wall's FACE is x = 0; the slab lives behind it. Everything applied is set out on the face, which
    // is the surface you can actually measure against on site.
    add(
      new BoxGeometry(params.wallThickness, params.wallHeight, params.wallLength).translate(
        -params.wallThickness / 2,
        params.wallHeight / 2,
        0,
      ),
      stone,
    );

    // The crown, swept along the top of the face. An open run: square cuts at both ends, where a real one
    // would die into a return or a corner — see Inside And Outside Corners for what happens at the turn.
    //
    // **Wound +z → −z, and that is load-bearing.** `facing` is measured against the run's own center, and
    // a STRAIGHT run's center lies ON the line — the test is degenerate, nothing is corrected, and the
    // option below is decoration. Which side the section lands on is decided entirely by traversal
    // direction. Reverse these two points and the crown sweeps to −x, inside the wall. Measured, not
    // guessed: the other order puts the profile at x −0.240 → 0.
    add(
      new MoldingGeometry({
        points: [new Vector3(0, params.wallHeight, half), new Vector3(0, params.wallHeight, -half)],
        closed: false,
        facing: "outward",
        run: "crown",
        style: params.style,
        drop: params.crownDrop,
        projection: params.crownProjection,
        segments: params.segments,
      }),
      crownStone,
    );

    const laid = stations(params.wallLength, params.spacing, params.endMargin, params.centered);

    if (params.corbels) {
      for (const [index, z] of laid.entries()) {
        // Two states, alternating. Odd brackets step OUT and DOWN — the shadow starts further from the
        // wall and ends lower, so neither edge of it lines up with its neighbors'.
        const odd = index % 2 === 1;
        const out = odd ? params.depthStagger : 0;
        const down = odd ? params.heightStagger : 0;

        const geometry = new ExtrudeGeometry(corbelShape(params.projection, params.drop), {
          depth: params.width,
          bevelEnabled: false,
        })
          .translate(0, 0, -params.width / 2)
          .translate(out, params.wallHeight - params.crownDrop - down, z);
        add(geometry, bracketStone);
      }
    }

    // What the layout cost. `pitch` is the request here because a straight run holds it exactly — the
    // slack goes to the margins instead, which is the whole difference between the two modes.
    const span = laid.length > 1 ? (laid.length - 1) * params.spacing : 0;
    const center = laid.length ? (laid[0]! + laid[laid.length - 1]!) / 2 : 0;
    params.laid = `${laid.length} corbels · pitch ${params.spacing.toFixed(3)} · span ${span.toFixed(3)}`;
    params.offset =
      Math.abs(center) < 1e-6
        ? "centered — remainder split between both margins"
        : `${center > 0 ? "+" : ""}${center.toFixed(3)} off-center — the whole remainder is at one end`;
  };
  rebuild();
  frameObject(handle, stage, { fit: 1.35 });

  const gui = new GUI();
  gui.title("Corbel Run");

  const corbel = gui.addFolder("Corbel");
  corbel.add(params, "corbels").name("Show").onChange(rebuild);
  corbel.add(params, "projection", 0.05, 0.6, 0.01).name("Projection").onChange(rebuild);
  // Depth over drop is what separates a bracket from a bump. Shallow and long reads as a pilaster stub.
  corbel.add(params, "drop", 0.1, 1.6, 0.02).name("Drop").onChange(rebuild);
  corbel.add(params, "width", 0.04, 0.5, 0.01).name("Width").onChange(rebuild);
  corbel.open();

  const rhythm = gui.addFolder("Rhythm");
  rhythm.add(params, "spacing", 0.3, 3, 0.05).name("Spacing (pitch)").onChange(rebuild);
  rhythm.add(params, "endMargin", 0, 2, 0.05).name("End Margin").onChange(rebuild);
  // THE two dials. Take both to zero — same brackets, same spacing, and the rank goes dead.
  rhythm.add(params, "depthStagger", 0, 0.3, 0.005).name("Depth Stagger").onChange(rebuild);
  rhythm.add(params, "heightStagger", 0, 0.3, 0.005).name("Height Stagger").onChange(rebuild);
  // Off is the bug, kept switchable because seeing it is the only way to learn to look for it.
  rhythm.add(params, "centered").name("Center The Rank").onChange(rebuild);
  rhythm.open();

  const crown = gui.addFolder("Crown");
  crown
    .add(params, "style", {
      "Cove (cavetto)": "cove",
      Ovolo: "ovolo",
      Chamfer: "chamfer",
      "Ogee (cyma recta)": "ogee",
      "Cyma (reversa)": "cyma",
      Scotia: "scotia",
      "Fillet (plain band)": "fillet",
      "Step (corbel)": "step",
    })
    .name("Profile")
    .onChange(rebuild);
  crown.add(params, "crownDrop", 0.05, 0.5, 0.01).name("Drop").onChange(rebuild);
  crown.add(params, "crownProjection", 0.05, 0.5, 0.01).name("Projection").onChange(rebuild);
  crown.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);

  const wall = gui.addFolder("Wall");
  wall.add(params, "wallLength", 2, 14, 0.5).name("Length").onChange(rebuild);
  wall.add(params, "wallHeight", 1.2, 5, 0.1).name("Height").onChange(rebuild);
  wall.add(params, "wallThickness", 0.1, 0.8, 0.05).name("Thickness").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "laid").name("Laid").listen().disable();
  readout.add(params, "offset").name("Centering").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    crownStone.dispose();
    bracketStone.dispose();
    wire.dispose();
    dispose();
  };
};

export default mount;
