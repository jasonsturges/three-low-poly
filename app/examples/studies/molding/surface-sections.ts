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
import { MoldingGeometry, type Vec2 } from "three-low-poly";
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
    "you can read at a glance.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  BATTEN     a plain rectangular strip. The surface family's `fillet` — the thing everything else is
//             built up from, and a legitimate molding on its own.
//  BEAD       a half-round standing proud of the surface. Large, it is a TORUS; the shape is the same and
//             the size is a parameter, so there is one entry, not two.
//  ASTRAGAL   a bead with a FILLET each side. The bead sits on a shallow step rather than straight on the
//             wall, which is what gives it a shadow line top and bottom.
//  REED       several beads side by side. REEDING is the surface; FLUTING is its negative, cut IN.
//  OVOLO      a convex quarter: square at the top, curving down to die into the wall.
//  OGEE       an S. Square at the top, hollow, then a bulge returning to the wall.
//  QUIRK      the narrow groove beside a bead that gives it its shadow. Not modelled here.
//
//  CHAIR RAIL / DADO RAIL / PICTURE RAIL are APPLICATIONS, not sections — a height on a wall, not a
//  shape. Any of the above becomes one by being run at the right height, which is why they are not in the
//  list. (Picture rail does want a top lip to hang hooks from; that is a real shape difference.)

type SurfaceStyle = "batten" | "bead" | "astragal" | "reed" | "ovolo" | "ogee";

const STYLES: SurfaceStyle[] = ["batten", "bead", "astragal", "reed", "ovolo", "ogee"];

/**
 * A section that sits on ONE surface.
 *
 * Same axes as {@link moldingProfile} — `x` runs along the wall, `y` out from it — so it drops into
 * `MoldingGeometry` unchanged. What differs is the CLOSURE: the back runs `(0,0) → (height, 0)` flat on
 * the wall, and the face leaves that surface and comes back to it. A corner section's face runs from one
 * back to a *different* back, which is why the two families cannot share a signature.
 */
function surfaceProfile(
  style: SurfaceStyle,
  height: number,
  projection: number,
  segments: number,
  reeds: number,
): Vec2[] {
  const steps = Math.max(1, Math.round(segments));
  // The flat back, always. Everything after this is the face.
  const points: Vec2[] = [
    [0, 0],
    [height, 0],
  ];

  /** Half an ellipse bulging out of the wall, from `x1` down to `x0`. */
  const bulge = (x0: number, x1: number, base: number, out: number, n: number) => {
    const mid = (x0 + x1) / 2;
    const half = (x1 - x0) / 2;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI;
      points.push([mid + half * Math.cos(t), base + out * Math.sin(t)]);
    }
  };

  switch (style) {
    case "batten":
      points.push([height, projection], [0, projection]);
      break;

    case "bead":
      bulge(0, height, 0, projection, steps * 2);
      break;

    case "astragal": {
      // The bead rides on a shallow fillet, top and bottom — that step is what casts the shadow line.
      const fillet = height * 0.18;
      const step = projection * 0.3;
      points.push([height, step], [height - fillet, step]);
      // The bulge already ends on `(fillet, step)`, so only the return to the wall is left to push.
      bulge(fillet, height - fillet, step, projection - step, steps * 2);
      points.push([0, step]);
      break;
    }

    case "reed": {
      // Several beads side by side. Walking top-down keeps the winding with the back.
      const count = Math.max(1, Math.round(reeds));
      const pitch = height / count;
      for (let i = 0; i < count; i++) {
        bulge(height - (i + 1) * pitch, height - i * pitch, 0, projection, steps);
      }
      break;
    }

    case "ovolo":
      // Square at the top, a convex quarter dying into the wall at the bottom.
      points.push([height, projection]);
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * (Math.PI / 2);
        points.push([height * (1 - Math.sin(t)), projection * Math.cos(t)]);
      }
      break;

    case "ogee": {
      // Square at the top, then two quarters of half size meeting at the middle: HOLLOW above, BULGING
      // below, so it returns to the wall the way a cyma does.
      //
      //   upper arc, centre (h/2, p)  ->  falls away from the chord, so it reads as hollow
      //   lower arc, centre (h/2, 0)  ->  stands proud of it, so it reads as a bulge
      const half = Math.max(1, Math.round(steps / 2));
      const hx = height / 2;
      const hy = projection / 2;
      for (let i = 0; i <= half; i++) {
        const t = (i / half) * (Math.PI / 2);
        points.push([hx + hx * Math.cos(t), projection - hy * Math.sin(t)]);
      }
      for (let i = 1; i <= half; i++) {
        const t = (i / half) * (Math.PI / 2);
        points.push([hx - hx * Math.sin(t), hy * Math.cos(t)]);
      }
      break;
    }
  }

  // The helpers above re-emit their start point, and a face that returns to the wall re-emits the origin.
  // A repeated point in a sweep profile is a zero-length edge — it costs a degenerate band and reads as a
  // self-intersection to anything auditing the polygon. Drop them once, here, rather than making every
  // branch remember.
  const distinct = points.filter(
    (p, i) => i === 0 || Math.hypot(p[0] - points[i - 1]![0], p[1] - points[i - 1]![1]) > 1e-12,
  );
  const first = distinct[0]!;
  const last = distinct[distinct.length - 1]!;
  if (distinct.length > 1 && Math.hypot(last[0] - first[0], last[1] - first[1]) < 1e-12) distinct.pop();

  return distinct;
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.1, 0.9, 1.9],
  });

  camera.fov = 26;
  camera.near = 0.005;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0.55, 0.02);
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
    const profile = surfaceProfile(style, params.height, params.projection, params.segments, params.reeds);
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
