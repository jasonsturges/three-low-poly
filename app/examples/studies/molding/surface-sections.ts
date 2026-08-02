import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Sprite,
  Vector3,
  WireframeGeometry,
} from "three";
import { MoldingGeometry, surfaceProfile, type SurfaceStyle } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { createTextSprite } from "../../../framework/createTextSprite";

export const meta = {
  title: "Surface Sections",
  description:
    "STUDY — the OTHER molding family: sections that sit on a SINGLE face. A cornice bridges two surfaces " +
    "and has two backs; a chair rail, a bead, an astragal, a picture rail all sit flat on one wall and " +
    "have one. The face therefore leaves the surface and returns to it, rather than running from one back " +
    "to a different one — which is the whole difference, and why they cannot share `moldingProfile`'s " +
    "`drop` and `projection`. These are sized by HEIGHT along the wall and PROJECTION out from it. " +
    "Nothing else changes: `MoldingGeometry` already takes a custom `profile`, so every one of these is " +
    "swept and mitered by the code that was already there. The lineup is the point — it is a vocabulary " +
    "you can read at a glance. Now shipping as `surfaceProfile`, which this study consumes.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  FILLET     a plain rectangular strip. A carpenter would call it a batten or a listel. The thing
//             everything else is built up from, and a legitimate molding on its own. The SAME element the
//             corner family calls `fillet` — proof that the two families share their curve VOCABULARY even
//             though they cannot share a section.
//  BEAD       a half-round standing proud of the surface. Large, it is a TORUS; the shape is the same and
//             the size is a parameter, so there is one entry, not two.
//  ASTRAGAL   a bead with a FILLET each side. The bead sits on a shallow step rather than straight on the
//             wall, which is what gives it a shadow line top and bottom.
//  REED       several beads side by side. REEDING is the surface; FLUTING is its negative, cut IN.
//  OVOLO      a convex quarter: square at the top, curving down to die into the wall.
//  OGEE       an S. Square at the top, hollow, then a bulge returning to the wall.
//  LIP        a crest that OVERHANGS, cut back beneath into a throat. The undercut is the point: a
//             picture-rail hook goes up into it and catches. Bead and astragal have undercuts too, but
//             shallow and at mid-height; this one is deep and sits high, where a hook reaches.
//  QUIRK      the narrow groove beside a bead that gives it its shadow. Not modelled here.
//
//  CHAIR RAIL / DADO RAIL / PICTURE RAIL are APPLICATIONS, not sections — a height on a wall, not a
//  shape. Any of the above becomes one by being run at the right height, which is why they are not in the
//  list. (Picture rail does want a top lip to hang hooks from; that is a real shape difference.)

const STYLES: SurfaceStyle[] = ["fillet", "bead", "astragal", "reed", "ovolo", "ogee", "lip"];

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    // Framed to hold the whole lineup AND its labels. The previous [1.1, 0.9, 1.9] on a 26 degree lens
    // showed about 1.0 of vertical against a 1.3 wall, so the top sections ran off the frame — and the
    // labels sit further left than the wall does, which is what sets the horizontal reach.
    cameraPosition: [1.3, 1.15, 3.2],
  });

  camera.fov = 28;
  camera.near = 0.005;
  camera.updateProjectionMatrix();
  // On the lineup's own middle rather than the wall's — the sections run from 0.16 to about 1.19.
  controls.target.set(0, 0.65, 0.02);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.2);
  key.position.set(0.9, 1.0, 1.4);
  const bounce = new DirectionalLight(0x9fb4d0, 0.5);
  bounce.position.set(-0.7, -0.3, 0.7);
  scene.add(key, bounce);

  const timber = new MeshStandardMaterial({
    color: 0xd8cdb8,
    roughness: 0.8,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const wallPaint = new MeshStandardMaterial({ color: 0x6c7480, roughness: 1 });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });
  const outline = new LineBasicMaterial({ color: 0xffd166 });

  const params = {
    lineup: true,
    style: "astragal" as SurfaceStyle,
    height: 0.07,
    projection: 0.028,
    segments: 6,
    reeds: 4,
    runLength: 1.1,
    corner: false,
    showWall: true,
    showSection: true,
    wireframe: false,
    readout: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof Line || child instanceof LineSegments) {
        child.geometry.dispose();
        stage.remove(child);
      } else if (child instanceof Sprite) {
        child.material.map?.dispose();
        child.material.dispose();
        stage.remove(child);
      }
    }
  };

  /** One run at a given height on the wall, from a custom section. */
  const run = (style: SurfaceStyle, y: number) => {
    const profile = surfaceProfile({
      style,
      height: params.height,
      projection: params.projection,
      segments: params.segments,
      reeds: params.reeds,
    });
    const half = params.runLength / 2;
    // `run: "base"` seeds the frame with UP, so the section's own `x` runs UP the wall and `y` out of it —
    // exactly what a rail wants. The corner variant proves the miter needs nothing new.
    const points = params.corner
      ? [new Vector3(-half, y, 0), new Vector3(half, y, 0), new Vector3(half, y, half)]
      : [new Vector3(-half, y, 0), new Vector3(half, y, 0)];

    const geometry = new MoldingGeometry({ points, profile, run: "base", facing: "outward" });
    stage.add(new Mesh(geometry, timber));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));

    if (params.showSection) {
      // The section itself, drawn at the near end. The flat BACK is the family's whole signature.
      const at = -half - 0.001;
      stage.add(
        new Line(
          new BufferGeometry().setFromPoints(
            [...profile, profile[0]!].map((p) => new Vector3(at, y + p[0], p[1])),
          ),
          outline,
        ),
      );
    }
    return geometry;
  };

  const rebuild = () => {
    clear();

    if (params.showWall) {
      const span = params.runLength + 0.3;
      stage.add(
        new Mesh(new BoxGeometry(span, 1.3, 0.04).translate(0, 0.6, -0.02), wallPaint),
      );
    }

    let verts = 0;
    if (params.lineup) {
      // The vocabulary, read at a glance. Every one is the same sweep with a different section.
      STYLES.forEach((style, index) => {
        const y = 0.16 + index * 0.16;
        verts += run(style, y).attributes.position!.count;
        const label = createTextSprite(style, {
          font: "ui-monospace, monospace",
          weight: "bold",
          size: 64,
          color: "#ffd166",
          scale: 0.05,
          x: -params.runLength / 2 - 0.22,
          y: y + params.height / 2,
          z: 0.06,
        });
        stage.add(label);
      });
      params.readout = `${STYLES.length} sections · ${verts} verts`;
    } else {
      verts = run(params.style, 0.55).attributes.position!.count;
      params.readout = `${params.style} · ${verts} verts`;
    }
  };
  rebuild();

  const gui = new GUI();
  gui.title("Surface Sections");

  const family = gui.addFolder("Family");
  // The lineup IS the study — one sweep, six sections, all of them one flat back and a face that returns.
  family.add(params, "lineup").name("Show All").onChange(rebuild);
  family.add(params, "style", STYLES).name("Section").onChange(rebuild);
  family.open();

  const section = gui.addFolder("Section");
  // HEIGHT along the wall and PROJECTION out from it — not `drop`/`projection`, because there is no
  // second surface for a drop to run along.
  section.add(params, "height", 0.02, 0.16, 0.002).name("Height").onChange(rebuild);
  section.add(params, "projection", 0.005, 0.08, 0.001).name("Projection").onChange(rebuild);
  section.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);
  section.add(params, "reeds", 2, 8, 1).name("Reeds").onChange(rebuild);
  section.open();

  const inspect = gui.addFolder("Inspect");
  // Turn it on and the runs wrap a corner — mitered by the code that was already there.
  inspect.add(params, "corner").name("Turn a Corner").onChange(rebuild);
  inspect.add(params, "showWall").name("Wall").onChange(rebuild);
  inspect.add(params, "showSection").name("Section Outline").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "runLength", 0.5, 2, 0.05).name("Run Length").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Geometry").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    timber.dispose();
    wallPaint.dispose();
    wire.dispose();
    outline.dispose();
    dispose();
  };
}
