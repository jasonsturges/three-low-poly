import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
  Sprite,
  Vector3,
  WireframeGeometry,
} from "three";
import { MoldingGeometry, surfaceProfile, type SurfaceStyle } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";
import { createTextSprite } from "../../../framework/createTextSprite";
import { clearDefaultLights } from "../../../framework/clearDefaultLights";

export const meta = {
  title: "Surface Profile Gallery",
  description:
    "Seven ornamental profiles that sit on a single supporting face: fillet, bead, astragal, reed, ovolo, ogee, and lip. Each cyan cross-section from surfaceProfile is paired with a wall-mounted sample swept by MoldingGeometry from exactly the same points. Drawings are enlarged 2× with their proportions preserved; all profiles share the same dimensions. Amber outlines mark the cut ends. Amber profile points reveal curve sampling. Select a profile to focus on it; each application uses the same short, straight run.",
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
//  QUIRK      the narrow groove beside a bead that gives it its shadow. Not modeled here.
//
//  CHAIR RAIL / DADO RAIL / PICTURE RAIL are APPLICATIONS, not sections — a height on a wall, not a
//  shape. Any of the above becomes one by being run at the right height, which is why they are not in the
//  list. (Picture rail does want a top lip to hang hooks from; that is a real shape difference.)

const STYLES: SurfaceStyle[] = ["fillet", "bead", "astragal", "reed", "ovolo", "ogee", "lip"];

// A fixed short sample keeps the comparison focused on the cross-section.
const RUN_LENGTH = 0.55;

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createOrthographicScene(container, {
    background: 0x141b24,
    frustumSize: 1.12,
    cameraPosition: [0, 0, 10],
    grid: false,
  });
  clearDefaultLights(scene);
  scene.add(new HemisphereLight(0xcddff5, 0x514236, 1.5));
  const key = new DirectionalLight(0xffffff, 3);
  key.position.set(-3, 4, 6);
  scene.add(key);

  const timber = new MeshStandardMaterial({
    color: 0xd8cdb8,
    roughness: 0.65,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const wallPaint = new MeshStandardMaterial({ color: 0x475563, roughness: 1 });
  const contour = new LineBasicMaterial({ color: 0x72d9ed });
  const guide = new LineBasicMaterial({ color: 0x445362 });
  const outline = new LineBasicMaterial({ color: 0xffbb66 });
  const wire = new LineBasicMaterial({ color: 0x72d9ed });
  const dots = new MeshBasicMaterial({ color: 0xffbb66 });
  const params = {
    lineup: true,
    style: "astragal" as SurfaceStyle,
    height: 0.07,
    projection: 0.028,
    segments: 6,
    reeds: 4,
    showWall: true,
    showProfiles: true,
    showPoints: true,
    showSection: true,
    wireframe: false,
    readout: "",
  };
  const stage = new Group();
  scene.add(stage);

  function clear() {
    stage.traverse((object) => {
      if (object instanceof Mesh || object instanceof Line) object.geometry.dispose();
      if (object instanceof InstancedMesh) object.dispose();
      if (object instanceof Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    stage.clear();
  }
  function label(text: string, x: number, y: number, scale = 0.065, color = "#e5edf5") {
    stage.add(createTextSprite(text, { size: 64, scale, x, y, color }));
  }
  function line(points: Vector3[], material: LineBasicMaterial, parent: Group = stage) {
    parent.add(new Line(new BufferGeometry().setFromPoints(points), material));
  }

  // Draw the section independently of the run's presentation rotation. The same SDK array feeds
  // both views; the diagram swaps the axes so projection reads right and wall distance reads vertically.
  function rebuild() {
    clear();
    const styles = params.lineup ? STYLES : [params.style];
    const height = params.height;
    const pitch = Math.max(0.22, height * 2 + 0.09);
    const top = ((styles.length - 1) * pitch) / 2;
    const sign = 1;
    let vertices = 0;
    let samples = 0;
    label("PROFILE ×2", -0.62, top + pitch * 0.7, 0.065, "#72d9ed");
    label("APPLICATION", 0.26, top + pitch * 0.7, 0.065);
    styles.forEach((style, index) => {
      const y = top - index * pitch;
      const profile = surfaceProfile({
        style,
        height: height,
        projection: params.projection,
        segments: params.segments,
        reeds: params.reeds,
      });
      samples += profile.length;
      label(style, -1.02, y, 0.08);

      if (params.showProfiles) {
        const chartX = -0.71;
        const chart = profile.map(([along, out]) => new Vector3(chartX + out * 2, y + sign * (along - height / 2) * 2, 0.02));
        // Bounds preserve aspect ratio and a common scale; no per-profile normalization.
        line(
          [
            new Vector3(chartX, y - height, 0),
            new Vector3(chartX + params.projection * 2, y - height, 0),
            new Vector3(chartX + params.projection * 2, y + height, 0),
            new Vector3(chartX, y + height, 0),
            new Vector3(chartX, y - height, 0),
          ],
          guide,
        );
        line([...chart, chart[0]!], contour);
        if (params.showPoints) {
          const markers = new InstancedMesh(new SphereGeometry(0.006, 8, 6), dots, chart.length);
          chart.forEach((point, i) => markers.setMatrixAt(i, new Matrix4().makeTranslation(point.x, point.y, 0.03)));
          markers.instanceMatrix.needsUpdate = true;
          stage.add(markers);
        }
      }

      // Each application is tilted locally, leaving its companion drawing square to the camera.
      const application = new Group();
      application.position.set(0.26, y, 0);
      application.rotation.set(0.12, 0.42, 0);
      stage.add(application);
      const half = RUN_LENGTH / 2;
      const origin = (-sign * height) / 2;
      const points = [new Vector3(-half, origin, 0), new Vector3(half, origin, 0)];
      const geometry = new MoldingGeometry({ points, profile, run: "base", facing: "outward" });
      application.add(new Mesh(geometry, timber));
      vertices += geometry.attributes.position!.count;
      if (params.wireframe) application.add(new LineSegments(new WireframeGeometry(geometry), wire));
      if (params.showSection)
        line(
          [...profile, profile[0]!].map(([along, out]) => new Vector3(-half - 0.001, origin + sign * along, out)),
          outline,
          application,
        );
      if (params.showWall) {
        application.add(new Mesh(new BoxGeometry(RUN_LENGTH + 0.08, height + 0.055, 0.018).translate(0, 0, -0.011), wallPaint));
      }
    });
    label("Projection → · height ↑ · cyan: profile · amber: cut end", -0.13, -top - pitch * 0.7, 0.037, "#9cabbc");
    params.readout = `${styles.length} profiles · ${samples} points · ${vertices} verts`;
  }

  // Fit the lineup for the host's actual viewport, including narrow windows, and offer a deliberate
  // reset after orbiting. Rebuilding shape parameters preserves the user's current inspection angle.
  function resetView() {
    const count = params.lineup ? STYLES.length : 1;
    const height = (count + 1) * Math.max(0.22, params.height * 2 + 0.09);
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    camera.zoom = Math.min(2.24 / height, (2.24 * aspect) / (RUN_LENGTH + 1.55)) * 0.88;
    camera.position.set(-0.12, 0, 10);
    camera.updateProjectionMatrix();
    controls.target.set(-0.12, 0, 0);
    controls.update();
  }
  const gui = new GUI();
  if (container.clientWidth < 900) gui.close();
  gui.title("Surface Profile Gallery");
  const family = gui.addFolder("Family");
  family
    .add(params, "lineup")
    .name("Show All")
    .onChange(() => {
      rebuild();
      resetView();
    });
  const styleControl = family
    .add(params, "style", STYLES)
    .name("Profile")
    .onChange(() => {
      params.lineup = false;
      gui.controllersRecursive().forEach((control) => control.updateDisplay());
      rebuild();
      resetView();
    });
  styleControl.listen();

  const section = gui.addFolder("Profile");
  section
    .add(params, "height", 0.02, 0.16, 0.002)
    .name("Height")
    .onChange(() => {
      rebuild();
      resetView();
    });
  section.add(params, "projection", 0.005, 0.08, 0.001).name("Projection").onChange(rebuild);
  section.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);
  section.add(params, "reeds", 2, 8, 1).name("Reeds").onChange(rebuild);
  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showProfiles").name("2D Profiles").onChange(rebuild);
  inspect.add(params, "showPoints").name("Profile Points").onChange(rebuild);
  inspect.add(params, "showSection").name("End Outlines").onChange(rebuild);
  inspect.add(params, "showWall").name("Supporting Surfaces").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add({ resetView }, "resetView").name("Reset View");
  gui.add(params, "readout").name("Geometry").listen().disable();
  rebuild();
  const resize = new ResizeObserver(resetView);
  resize.observe(container);
  resetView();
  return () => {
    resize.disconnect();
    gui.destroy();
    clear();
    [timber, wallPaint, contour, guide, outline, wire, dots].forEach((material) => material.dispose());
    dispose();
  };
}
