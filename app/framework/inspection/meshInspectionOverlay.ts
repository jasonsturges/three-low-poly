import { BufferGeometry, Group, LineBasicMaterial, LineSegments, Points, PointsMaterial } from "three";
import type { GeometryInspection } from "three-low-poly";

/** Caller adds group to the same local coordinate frame as the inspected mesh, then disposes this handle. */
export function meshInspectionOverlay(
  report: GeometryInspection,
  options = { boundaries: true, winding: true, nonManifold: true, problems: true },
) {
  const group = new Group(),
    geometries: BufferGeometry[] = [],
    materials: (LineBasicMaterial | PointsMaterial)[] = [];
  const lines = (edges: [number, number][], color: number) => {
    const geometry = new BufferGeometry().setFromPoints(edges.flatMap(([a, b]) => [report.points[a], report.points[b]]));
    const material = new LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 });
    group.add(new LineSegments(geometry, material));
    geometries.push(geometry);
    materials.push(material);
  };
  if (options.boundaries) lines(report.boundary, 0x75e5ac);
  if (options.winding) lines(report.winding, 0xffbb55);
  if (options.nonManifold) lines(report.nonManifold, 0xff5a68);
  if (options.problems) {
    lines(
      [...new Set([...report.degenerate, ...report.duplicate])].flatMap((f) => {
        const t = report.triangles[f];
        return [
          [t[0], t[1]],
          [t[1], t[2]],
          [t[2], t[0]],
        ] as [number, number][];
      }),
      0xe789fa,
    );
    const vertices = [...new Set([...report.nonManifoldVertices, ...report.degenerate.flatMap((f) => report.triangles[f])])];
    const geometry = new BufferGeometry().setFromPoints(vertices.map((v) => report.points[v]));
    const material = new PointsMaterial({ color: 0xff5a68, size: 8, sizeAttenuation: false, depthTest: false });
    group.add(new Points(geometry, material));
    geometries.push(geometry);
    materials.push(material);
  }
  return {
    group,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      group.clear();
    },
  };
}
