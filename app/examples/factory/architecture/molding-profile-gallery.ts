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
import { MoldingGeometry, moldingProfile, type MoldingStyle } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";
import { createTextSprite } from "../../../framework/createTextSprite";
import { clearDefaultLights } from "../../../framework/clearDefaultLights";

export const meta = {
  title: "Molding Profile Gallery",
  description:
    "Eight solid-backed corner profiles from moldingProfile, paired with the exact cross-section used by each MoldingGeometry sweep. Two backs meet at the wall and ceiling or floor. Switch crown/base to see the same profile hang down or rise up. Drawings are enlarged 2× with their proportions preserved; all profiles share the same dimensions. Amber outlines mark the cut ends. Amber profile points reveal curve sampling. Select a profile to focus on it; each application uses the same short, straight run.",
};

const STYLES: MoldingStyle[] = ["cove", "ovolo", "chamfer", "ogee", "cyma", "scotia", "fillet", "step"];

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
    style: "ogee" as MoldingStyle,
    drop: 0.09,
    projection: 0.065,
    segments: 6,
    run: "crown" as "crown" | "base",
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
    const height = params.drop;
    const pitch = Math.max(0.22, height * 2 + 0.09);
    const top = ((styles.length - 1) * pitch) / 2;
    const sign = params.run === "crown" ? -1 : 1;
    let vertices = 0;
    let samples = 0;
    label("PROFILE ×2", -0.62, top + pitch * 0.7, 0.065, "#72d9ed");
    label("APPLICATION", 0.26, top + pitch * 0.7, 0.065);
    styles.forEach((style, index) => {
      const y = top - index * pitch;
      const profile = moldingProfile({ style, drop: height, projection: params.projection, segments: params.segments });
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
      const geometry = new MoldingGeometry({ points, profile, run: params.run, facing: "outward" });
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
        application.add(
          new Mesh(
            new BoxGeometry(RUN_LENGTH + 0.08, 0.018, params.projection + 0.045).translate(
              0,
              origin - sign * 0.011,
              params.projection / 2,
            ),
            wallPaint,
          ),
        );
      }
    });
    label(
      "Projection → · crown drops / base rises · cyan: profile · amber: cut end",
      -0.13,
      -top - pitch * 0.7,
      0.055,
      "#9cabbc",
    );
    params.readout = `${styles.length} profiles · ${samples} points · ${vertices} verts`;
  }

  // Fit the lineup for the host's actual viewport, including narrow windows, and offer a deliberate
  // reset after orbiting. Rebuilding shape parameters preserves the user's current inspection angle.
  function resetView() {
    const count = params.lineup ? STYLES.length : 1;
    const height = (count + 1) * Math.max(0.22, params.drop * 2 + 0.09);
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    camera.zoom = Math.min(2.24 / height, (2.24 * aspect) / (RUN_LENGTH + 1.55)) * 0.88;
    camera.position.set(-0.12, 0, 10);
    camera.updateProjectionMatrix();
    controls.target.set(-0.12, 0, 0);
    controls.update();
  }
  const gui = new GUI();
  if (container.clientWidth < 900) gui.close();
  gui.title("Molding Profile Gallery");
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
  family.add(params, "run", ["crown", "base"]).name("Application").onChange(rebuild);
  const section = gui.addFolder("Profile");
  section
    .add(params, "drop", 0.02, 0.16, 0.002)
    .name("Drop / Rise")
    .onChange(() => {
      rebuild();
      resetView();
    });
  section.add(params, "projection", 0.005, 0.08, 0.001).name("Projection").onChange(rebuild);
  section.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);

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
