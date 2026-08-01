import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  WireframeGeometry,
} from "three";
import {
  linePath,
  miterFrames,
  moldingProfile,
  type MoldingStyle,
  sweep,
  type Vec2,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Sprung Section",
  description:
    "STUDY — can a molding section be SPRUNG? A sprung molding does not fill its corner: it bridges it, " +
    "touching wall and ceiling on two narrow flats with a triangular void behind. That is why one crown " +
    "profile serves several wall angles, and why a miter saw has two settings. (Nothing to do with an " +
    "arch's SPRINGING, which is a height — the words share a root and no meaning.) `drop` and " +
    "`projection` stay exactly right, because they are still where the two flats touch; only the BACK " +
    "changes. The open question this answers: a face can only be sprung if it stays OUTSIDE the back " +
    "chord, and a hollow one may not. Drag Spring and watch the verdict — every style has a hard ceiling, " +
    "and the readout reports it.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  SPRUNG        installed at an angle across a corner, touching each surface on a narrow flat.
//  SPRING ANGLE  the tilt of the back against the wall. Standard crown is 38°/52° or 45°/45°.
//  FLAT          the strip of back that actually touches a surface. What the molding is nailed through.
//  BACK CHORD    the straight run of back that bridges the void between the two flats.
//  VOID          the triangle of air behind a sprung molding. The whole point: less material, and one
//                profile fits many corners.
//  SPRINGING     an ARCH term — the height where it leaves the jambs. A false friend; unrelated.

/**
 * The chord's LEVEL, in the corner's own normalised coordinates.
 *
 * `level(p) = p.x / drop + p.y / projection` is `1` on the line joining the two backs' outer ends and `0`
 * at the corner, so it measures how far out from the corner a point sits regardless of the section's
 * proportions. The back chord for a given `spring` is exactly the line `level = spring`.
 *
 * Which makes the whole question a single number: **a face can be sprung up to the MINIMUM level it
 * reaches.** Past that the chord passes outside the face and the section turns itself inside out.
 */
const levelOf = (p: Vec2, drop: number, projection: number) => p[0] / drop + p[1] / projection;

interface Sprung {
  profile: Vec2[];
  chord: [Vec2, Vec2];
  /** The lowest level the face reaches — the hard ceiling on `spring` for this style. */
  ceiling: number;
  valid: boolean;
}

/**
 * A solid-backed section, sprung.
 *
 * The face is untouched; only the backs are shortened and joined by a chord. At `spring = 0` the flats are
 * full length and the chord is degenerate — that is the solid section, unchanged. At `spring → 1` the
 * flats vanish and it touches at two POINTS.
 */
function springSection(
  style: MoldingStyle,
  drop: number,
  projection: number,
  segments: number,
  spring: number,
): Sprung {
  const solid = moldingProfile({ style, drop, projection, segments });
  // `moldingProfile` puts the corner first and the face after it.
  const face = solid.slice(1);

  const ceiling = Math.min(...face.map((p) => levelOf(p, drop, projection)));
  const a: Vec2 = [drop * spring, 0];
  const b: Vec2 = [0, projection * spring];

  // At zero the two chord ends collapse onto the corner, which is the solid section — emit it as such
  // rather than as a pair of duplicated points.
  const profile = spring < 1e-9 ? solid : [a, ...face, b];
  return { profile, chord: [a, b], ceiling, valid: spring <= ceiling + 1e-9 };
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.5, 0.9, 1.7],
  });

  camera.fov = 24;
  camera.near = 0.005;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0.02, 0);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.25);
  key.position.set(1.0, 1.1, 1.3);
  const bounce = new DirectionalLight(0x9fb4d0, 0.5);
  bounce.position.set(-0.7, -0.4, 0.6);
  scene.add(key, bounce);

  const plaster = new MeshStandardMaterial({
    color: 0xd8d2c6,
    roughness: 0.9,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const invalid = new MeshStandardMaterial({
    color: 0xd85a5a,
    roughness: 0.7,
    flatShading: true,
    side: DoubleSide,
  });
  const surface = new MeshBasicMaterial({
    color: 0x6bb6ff,
    transparent: true,
    opacity: 0.14,
    side: DoubleSide,
    depthWrite: false,
  });
  const voidFill = new MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.22,
    side: DoubleSide,
    depthWrite: false,
  });
  const faceLine = new LineBasicMaterial({ color: 0x7fe3a1 });
  const backLine = new LineBasicMaterial({ color: 0xffd166 });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    style: "ovolo" as MoldingStyle,
    drop: 0.16,
    projection: 0.16,
    segments: 8,
    spring: 0.4,
    runLength: 0.9,
    showSurfaces: true,
    showSection: true,
    wireframe: false,
    springAngle: "",
    flats: "",
    ceiling: "",
    verdict: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof Line || child instanceof LineSegments) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  /** A profile point placed in the run's frame: `x` along the wall (down), `y` out from it. */
  const place = (p: Vec2, along: number) => new Vector3(along, -p[0], p[1]);

  const rebuild = () => {
    clear();
    const { profile, chord, ceiling, valid } = springSection(
      params.style,
      params.drop,
      params.projection,
      params.segments,
      params.spring,
    );

    // A straight run, so no miter is involved — this study is about the SECTION, not the corner.
    const from = new Vector3(-params.runLength / 2, 0, 0);
    const to = new Vector3(params.runLength / 2, 0, 0);
    // `x` of the profile runs DOWN the wall and `y` out from it, which is what a crown does.
    const stations = miterFrames(linePath(from, to, 1), { reference: new Vector3(0, -1, 0) });
    const geometry = sweep(profile, stations);
    stage.add(new Mesh(geometry, valid ? plaster : invalid));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));

    if (params.showSurfaces) {
      // The two surfaces the molding is sprung across. The flats touch these; the void does not.
      const reach = params.runLength / 2;
      const size = Math.max(params.drop, params.projection) * 2.4;
      const quad = (corners: Vector3[]) =>
        new Mesh(
          new BufferGeometry().setFromPoints([
            corners[0]!,
            corners[1]!,
            corners[2]!,
            corners[0]!,
            corners[2]!,
            corners[3]!,
          ]),
          surface,
        );
      // Wall: the plane z = 0, hanging below the corner line. Ceiling: y = 0, running out in +z.
      stage.add(
        quad([
          new Vector3(-reach, 0, 0),
          new Vector3(reach, 0, 0),
          new Vector3(reach, -size, 0),
          new Vector3(-reach, -size, 0),
        ]),
        quad([
          new Vector3(-reach, 0, 0),
          new Vector3(reach, 0, 0),
          new Vector3(reach, 0, size),
          new Vector3(-reach, 0, size),
        ]),
      );
    }

    if (params.showSection) {
      const at = params.runLength / 2 + 0.001;
      // The FACE — everything the room sees.
      const face = profile.slice(params.spring < 1e-9 ? 1 : 1, params.spring < 1e-9 ? undefined : -1);
      stage.add(
        new Line(new BufferGeometry().setFromPoints(face.map((p) => place(p, at))), faceLine),
      );
      // The BACK — the two flats and the chord that bridges them.
      stage.add(
        new Line(
          new BufferGeometry().setFromPoints(
            [
              [params.drop, 0] as Vec2,
              chord[0],
              chord[1],
              [0, params.projection] as Vec2,
            ].map((p) => place(p, at)),
          ),
          backLine,
        ),
      );
      // The VOID: the triangle of air the chord cuts off.
      if (params.spring > 1e-9) {
        stage.add(
          new Mesh(
            new BufferGeometry().setFromPoints([
              place([0, 0], at),
              place(chord[0], at),
              place(chord[1], at),
            ]),
            voidFill,
          ),
        );
      }
    }

    const angle = MathUtils.radToDeg(Math.atan2(params.projection * params.spring, params.drop * params.spring));
    params.springAngle = params.spring < 1e-9 ? "— (solid backed)" : `${angle.toFixed(1)}° to the wall`;
    params.flats = `wall ${(params.drop * (1 - params.spring)).toFixed(4)} · ceiling ${(params.projection * (1 - params.spring)).toFixed(4)}`;
    params.ceiling = `${ceiling.toFixed(4)}  (this style's hard limit)`;
    params.verdict = valid
      ? params.spring < 1e-9
        ? "solid backed — fills the corner"
        : "sprung — the face clears the back chord"
      : `INVALID — the face digs ${(params.spring - ceiling).toFixed(4)} inside the back`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Sprung Section");

  const back = gui.addFolder("Back");
  // 0 fills the corner. Raise it and the flats shorten, the void opens, and eventually the face crosses
  // the chord — which is the whole question.
  back.add(params, "spring", 0, 1, 0.005).name("Spring").onChange(rebuild);
  back.open();

  const section = gui.addFolder("Section");
  section
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
  section.add(params, "drop", 0.04, 0.4, 0.005).name("Drop").onChange(rebuild);
  section.add(params, "projection", 0.04, 0.4, 0.005).name("Projection").onChange(rebuild);
  section.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);
  section.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showSurfaces").name("Wall & Ceiling").onChange(rebuild);
  inspect.add(params, "showSection").name("Section Outline").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "runLength", 0.3, 1.6, 0.05).name("Run Length").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "springAngle").name("Spring Angle").listen().disable();
  readout.add(params, "flats").name("Flats").listen().disable();
  readout.add(params, "ceiling").name("Max Spring").listen().disable();
  readout.add(params, "verdict").name("Verdict").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    plaster.dispose();
    invalid.dispose();
    surface.dispose();
    voidFill.dispose();
    faceLine.dispose();
    backLine.dispose();
    wire.dispose();
    dispose();
  };
}
