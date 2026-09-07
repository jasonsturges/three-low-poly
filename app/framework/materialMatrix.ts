import GUI from "lil-gui";
import type { MeshPhysicalNodeMaterial } from "three/webgpu";
import { BufferGeometry, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three";
import { createOrthographicScene } from "./createOrthographicScene";
import { materialStudyLabels, materialStudyLights } from "./materialStudy";

interface Axis {
  name: string;
  min?: number;
  max?: number;
  format?: (value: number) => string;
}
interface MaterialMatrixOptions<M extends MeshStandardMaterial | MeshPhysicalNodeMaterial> {
  title: string;
  columns: Axis;
  rows: Axis;
  makeMaterial: (columnValue: number, rowValue: number) => M;
  controls?: (gui: GUI, materials: M[]) => void;
}

/** Shared presentation for the material references; material recipes remain in each example. */
export function materialMatrix<M extends MeshStandardMaterial | MeshPhysicalNodeMaterial>(
  container: HTMLElement,
  options: MaterialMatrixOptions<M>,
) {
  const { scene, camera, controls, dispose } = createOrthographicScene(container, {
    background: 0x10151d,
    frustumSize: 18,
    cameraPosition: [0, 0, 40],
    grid: false,
  });
  const gui = new GUI();
  gui.title(options.title);
  const disposeLights = materialStudyLights(scene, gui);
  const labels = materialStudyLabels(scene);
  const geometry = new SphereGeometry(0.85, 40, 28);
  // Anisotropy needs a consistent tangent direction across the shared UV layout.
  geometry.computeTangents();
  const materials: M[] = [];
  const lines: Vector3[] = [];
  const count = 11;
  const spacing = 2.5;
  const extent = ((count - 1) * spacing) / 2;
  const value = (axis: Axis, index: number) => (axis.min ?? 0) + (((axis.max ?? 1) - (axis.min ?? 0)) * index) / (count - 1);
  const format = (axis: Axis, v: number) => axis.format?.(v) ?? v.toFixed(1);

  for (let row = 0; row < count; row++) {
    const y = extent - row * spacing;
    labels.add(format(options.rows, value(options.rows, row)), -extent - 2, y + 0.2, 0.85);
    for (let col = 0; col < count; col++) {
      const x = col * spacing - extent;
      if (row === 0) labels.add(format(options.columns, value(options.columns, col)), x, extent + 2, 0.85);
      const material = options.makeMaterial(value(options.columns, col), value(options.rows, row));
      materials.push(material);
      const sphere = new Mesh(geometry, material);
      sphere.position.set(x, y, 0);
      scene.add(sphere);
      const half = 1.13;
      const corners = [
        [x - half, y - half],
        [x + half, y - half],
        [x + half, y + half],
        [x - half, y + half],
      ];
      for (let edge = 0; edge < 4; edge++) {
        for (const corner of [corners[edge], corners[(edge + 1) % 4]]) lines.push(new Vector3(corner[0], corner[1], -0.95));
      }
    }
  }
  labels.add(`${options.columns.name} →`, 0, extent + 3.6, 1.2);
  labels.add(`${options.rows.name} · top → bottom`, 0, -extent - 2.4, 1.05);
  const grid = new LineSegments(new BufferGeometry().setFromPoints(lines), new LineBasicMaterial({ color: 0x293646 }));
  scene.add(grid);
  options.controls?.(gui, materials);
  const view = gui.addFolder("View");
  view.add(grid, "visible").name("Cell Guides");
  view
    .add(
      {
        reset() {
          camera.position.set(0, 0, 40);
          camera.zoom = 1;
          camera.updateProjectionMatrix();
          controls.target.set(0, 0, 0);
          controls.update();
        },
      },
      "reset",
    )
    .name("Reset View");
  view.close();

  return () => {
    gui.destroy();
    labels.dispose();
    geometry.dispose();
    materials.forEach((material) => material.dispose());
    grid.geometry.dispose();
    grid.material.dispose();
    disposeLights();
    dispose();
  };
}
