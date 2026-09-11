import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Sprite,
  Vector3,
} from "three";
import { ArchedSlabShape, type ArchStyle } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";
import { createTextSprite } from "../../../framework/createTextSprite";
import { clearDefaultLights } from "../../../framework/clearDefaultLights";

export const meta = {
  title: "Arch Profile Gallery",
  description:
    "Each cyan outline is sampled from the same ArchedSlabShape used by its solid extrusion, at the same scale. Amber dots mark tessellation samples, not Bézier control handles. Span, body height, rise, and curve segments update both views. Each named arch constrains rise to its own regime; the guide across the drawing marks the springing line. Select a profile to inspect it alone. Orbit to see the slab depth.",
};

// Keep the circular family together. Each named profile constrains rise to its own regime.
const STYLES: ArchStyle[] = ["square", "segmental", "semicircle", "horseshoe", "elliptical", "pointed", "ogee"];

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createOrthographicScene(container, {
    background: 0x141b24,
    frustumSize: 7,
    cameraPosition: [0, 0, 20],
    grid: false,
  });
  clearDefaultLights(scene);
  scene.add(new HemisphereLight(0xcddff5, 0x514236, 1.5));
  const key = new DirectionalLight(0xffffff, 3);
  key.position.set(-3, 4, 6);
  scene.add(key);
  const params = {
    rise: 0.8,
    width: 1,
    height: 1,
    curveSegments: 24,
    lineup: true,
    profile: "ogee" as ArchStyle,
    showPoints: true,
  };
  const stone = new MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.9, flatShading: true });
  const cyan = new LineBasicMaterial({ color: 0x72d9ed });
  const guide = new LineBasicMaterial({ color: 0x293646, depthWrite: false });
  const amber = new MeshBasicMaterial({ color: 0xffbb66 });
  const stage = new Group();
  scene.add(stage);
  let viewWidth = 1;
  let viewHeight = 1;

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
  function label(text: string, x: number, y: number, scale = 0.26, color = "#e5edf5") {
    stage.add(createTextSprite(text, { size: 64, scale, x, y, z: 0.18, color }));
  }
  function line(points: Vector3[], material: LineBasicMaterial) {
    stage.add(new Line(new BufferGeometry().setFromPoints(points), material));
  }
  function rebuild() {
    clear();
    const styles = params.lineup ? STYLES : [params.profile];
    const columns = Math.min(3, styles.length);
    const rows = Math.ceil(styles.length / columns);
    const entries = styles.map((style) => {
      const shape = new ArchedSlabShape({ width: params.width, height: params.height, archHeight: params.rise, arch: style });
      // ExtrudeGeometry uses these same sampled contour points.
      return { style, shape, samples: shape.extractPoints(params.curveSegments).shape };
    });
    // Horseshoe arches can bulge beyond the springing span. Measure the contour for safe spacing.
    const halfWidth = Math.max(...entries.flatMap(({ samples }) => samples.map((p) => Math.abs(p.x))));
    const maxHeight = Math.max(...entries.flatMap(({ samples }) => samples.map((p) => p.y)));
    const cellWidth = Math.max(3.4, halfWidth * 4 + 1.2);
    const cellHeight = maxHeight + 1.3;
    viewWidth = columns * cellWidth;
    viewHeight = rows * cellHeight + 0.65;
    entries.forEach(({ style, shape, samples }, index) => {
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, styles.length - row * columns);
      const x = ((index % columns) - (rowCount - 1) / 2) * cellWidth;
      const y = viewHeight / 2 - (row + 1) * cellHeight;
      const offset = halfWidth + 0.25;
      const points = samples.map((p) => new Vector3(x - offset + p.x, y + p.y, 0.02));
      line([...points, points[0]!], cyan);
      line(
        [
          new Vector3(x - offset - params.width / 2 - 0.08, y + params.height, 0),
          new Vector3(x - offset + params.width / 2 + 0.08, y + params.height, 0),
        ],
        guide,
      );
      if (params.showPoints) {
        const markers = new InstancedMesh(new SphereGeometry(0.018, 8, 6), amber, points.length);
        points.forEach((p, i) => markers.setMatrixAt(i, new Matrix4().makeTranslation(p.x, p.y, 0.04)));
        markers.instanceMatrix.needsUpdate = true;
        stage.add(markers);
      }
      const slab = new Mesh(
        new ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false, curveSegments: params.curveSegments }),
        stone,
      );
      slab.position.set(x + offset, y, 0);
      stage.add(slab);
      label(style, x, y + cellHeight - 0.85, 0.36);
      label("Profile", x - offset, y - 0.23, 0.22, "#72d9ed");
      label("Extrusion", x + offset, y - 0.23, 0.22);
      line([new Vector3(x - cellWidth / 2 + 0.1, y - 0.48, -0.05), new Vector3(x + cellWidth / 2 - 0.1, y - 0.48, -0.05)], guide);
    });
  }
  function resetView() {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    camera.zoom = Math.min(14 / viewHeight, (14 * aspect) / viewWidth) * 0.87;
    camera.position.set(0, 0, 20);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
  }
  const gui = new GUI();
  gui.title(meta.title);
  if (container.clientWidth < 900) gui.close();
  const reshape = () => {
    rebuild();
    resetView();
  };
  gui.add(params, "rise", 0.05, 1.4, 0.01).name("Rise").onChange(reshape);
  gui.add(params, "width", 0.5, 1.4, 0.05).name("Span").onChange(reshape);
  gui.add(params, "height", 0.2, 2, 0.05).name("Body Height").onChange(reshape);
  gui.add(params, "curveSegments", 2, 32, 1).name("Curve Segments").onChange(reshape);
  const view = gui.addFolder("View");
  view.add(params, "lineup").name("Show All").listen().onChange(reshape);
  view
    .add(params, "profile", STYLES)
    .name("Profile")
    .onChange(() => {
      params.lineup = false;
      reshape();
    });
  view.add(params, "showPoints").name("Profile Points").onChange(rebuild);
  view.add({ resetView }, "resetView").name("Reset View");
  rebuild();
  const observer = new ResizeObserver(resetView);
  observer.observe(container);
  resetView();
  return () => {
    observer.disconnect();
    gui.destroy();
    clear();
    [stone, cyan, guide, amber].forEach((m) => m.dispose());
    dispose();
  };
}
