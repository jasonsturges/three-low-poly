import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  FrontSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  TextureLoader,
  WireframeGeometry,
} from "three";
import { inspectGeometry } from "three-low-poly";
import { createScene } from "../framework/createScene";
import { frameObject } from "../framework/frameObject";
import { meshInspectionOverlay } from "../framework/inspection/meshInspectionOverlay";

/** Presentation only: each experiment supplies owned geometry and its own controls. */
export function modelingLabView(
  container: HTMLElement,
  title: string,
  build: () => { geometry: BufferGeometry; guides?: BufferGeometry[]; contours?: BufferGeometry[]; message: string },
  controls: (gui: GUI, rebuild: () => void) => void,
) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [4, 3, 6] });
  const stage = new Group();
  handle.scene.add(stage);
  const key = new DirectionalLight(0xffeee0, 2.5);
  key.position.set(3, 5, 4);
  const fill = new DirectionalLight(0xb4ccff, 1.7);
  fill.position.set(-3, -2, -4);
  handle.scene.add(key, fill);
  const texture = new TextureLoader().load(`${import.meta.env.BASE_URL}uv-grid.jpg`);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  const materials = [0x79adc4, 0xd6a08b, 0xe1bd75, 0x91caa1, 0xa3a0db, 0x75c8cf, 0xdb9fc6, 0xb3bf72].map(
    (color) =>
      new MeshStandardMaterial({
        color,
        side: FrontSide,
        roughness: 0.65,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
  );
  const ghost = new LineBasicMaterial({ color: 0x8997ab, transparent: true, opacity: 0.28 });
  const sectionLines = new LineBasicMaterial({ color: 0xe8dfa4, depthTest: false });
  const wire = new LineBasicMaterial({ color: 0x172029, transparent: true, opacity: 0.5 });
  const gui = new GUI({ title, width: 330 });
  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.setAttribute("aria-label", "Experiment measurements");
  status.style.cssText = "padding:12px;white-space:pre-line;line-height:1.5;max-height:240px;overflow:auto;font-size:12px";
  const view = { grid: false, wire: false, guides: true, problems: true, contours: true };
  let owned: BufferGeometry[] = [],
    overlay: ReturnType<typeof meshInspectionOverlay> | undefined;
  const clear = () => {
    overlay?.dispose();
    overlay = undefined;
    owned.forEach((g) => g.dispose());
    owned = [];
    stage.clear();
  };
  const rebuild = () => {
    clear();
    try {
      const result = build();
      owned.push(result.geometry, ...(result.guides ?? []), ...(result.contours ?? []));
      materials.forEach((m) => {
        m.map = view.grid ? texture : null;
        m.needsUpdate = true;
      });
      stage.add(new Mesh(result.geometry, materials));
      if (view.wire) {
        const g = new WireframeGeometry(result.geometry);
        owned.push(g);
        stage.add(new LineSegments(g, wire));
      }
      if (view.guides)
        for (const source of result.guides ?? []) {
          const g = new WireframeGeometry(source);
          owned.push(g);
          stage.add(new LineSegments(g, ghost));
        }
      if (view.contours) for (const contour of result.contours ?? []) stage.add(new LineSegments(contour, sectionLines));
      if (!result.geometry.getAttribute("position").count) {
        status.textContent = `${result.message}\n\nEmpty result · volume 0`;
        return;
      }
      const report = inspectGeometry(result.geometry);
      if (view.problems) {
        overlay = meshInspectionOverlay(report);
        stage.add(overlay.group);
      }
      const closed = report.components.length > 0 && report.components.every((c) => c.closed);
      const volume = closed ? report.components.reduce((s, c) => s + (c.signedVolume ?? 0), 0).toFixed(4) : "unqualified";
      status.textContent = `${result.message}\n\n${report.triangles.length} triangles · ${report.components.length} components\nBoundary ${report.boundary.length} · winding ${report.winding.length}\nNonmanifold edges ${report.nonManifold.length} · vertices ${report.nonManifoldVertices.length}\nDegenerate ${report.degenerate.length} · duplicate ${report.duplicate.length}\nSigned volume ${volume}\n\nSingle-sided faces. Green = boundary; amber = winding; red = nonmanifold. Self-intersections are not checked.`;
    } catch (error) {
      clear();
      status.textContent = `Experiment rejected:\n${(error as Error).message}`;
    }
  };
  controls(gui, rebuild);
  const folder = gui.addFolder("Inspect");
  folder.add(view, "grid").name("UV grid").onChange(rebuild);
  folder.add(view, "wire").name("Triangle edges").onChange(rebuild);
  folder.add(view, "guides").name("Source wireframes").onChange(rebuild);
  folder.add(view, "contours").name("Cross-section contours").onChange(rebuild);
  folder.add(view, "problems").name("Topology diagnostics").onChange(rebuild);
  const frame = () => {
    frameObject(handle, stage, { fit: 1.5 });
  };
  gui.add({ frame }, "frame").name("Frame study");
  gui.domElement.appendChild(status);
  const layout = () => {
    const w = container.clientWidth,
      h = container.clientHeight,
      p = Math.min(330, w * 0.45);
    gui.domElement.style.width = `${p}px`;
    handle.camera.setViewOffset(w, h, p / 2, 0, w, h);
    handle.camera.updateProjectionMatrix();
  };
  const resize = new ResizeObserver(layout);
  resize.observe(container);
  rebuild();
  frame();
  layout();
  return () => {
    resize.disconnect();
    clear();
    gui.destroy();
    materials.forEach((m) => m.dispose());
    ghost.dispose();
    wire.dispose();
    sectionLines.dispose();
    texture.dispose();
    handle.dispose();
  };
}
