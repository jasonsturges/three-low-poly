import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  EdgesGeometry,
  FrontSide,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  TetrahedronGeometry,
  Vector3,
  WireframeGeometry,
} from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { bevelConvexGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Convex Bevel",
  description:
    "STUDY — constant-radius bevels on closed convex meshes. All geometric edges are treated; " +
    "coplanar triangle diagonals are ignored. One segment creates a chamfer; more segments sample circular " +
    "edge bands and spherical corner patches. Blue faces, gold bands and coral corners reveal the joins. " +
    "Radius is the rolling-ball radius, not a uniform face setback: sharper edges consume more face area. " +
    "The SDK bevelConvexGeometry tool reconstructs a convex hull around an inset core. It does not preserve UVs or source " +
    "materials, and does not yet support concave shapes or selective edges. All materials are single-sided.",
};
export type BevelShape = "Box" | "Tapered block" | "Wedge" | "Tetrahedron" | "Octahedron" | "Icosahedron";
export function bevelStudySource(shape: BevelShape): BufferGeometry {
  if (shape === "Tetrahedron") return new TetrahedronGeometry(1.45);
  if (shape === "Octahedron") return new OctahedronGeometry(1.45);
  if (shape === "Icosahedron") return new IcosahedronGeometry(1.45);
  if (shape === "Wedge")
    return new ConvexGeometry([
      new Vector3(-1.3, -0.8, -0.8),
      new Vector3(1.3, -0.8, -0.8),
      new Vector3(-0.7, 0.9, -0.8),
      new Vector3(-1.3, -0.8, 0.8),
      new Vector3(1.3, -0.8, 0.8),
      new Vector3(-0.7, 0.9, 0.8),
    ]);
  const geometry = new BoxGeometry(2.6, 1.8, 1.6);
  if (shape === "Tapered block") {
    const p = geometry.getAttribute("position");
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * 0.65 + 0.25, p.getY(i), p.getZ(i) * 0.7);
    geometry.computeVertexNormals();
  }
  return geometry;
}
export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [3, 2.5, 4] });
  const keyLight = new DirectionalLight(0xffeee0, 2);
  keyLight.position.set(3, 5, 4);
  const fill = new DirectionalLight(0xb4ccff, 1.5);
  fill.position.set(-3, -2, -4);
  handle.scene.add(keyLight, fill);
  const stage = new Group();
  handle.scene.add(stage);
  const materials = [0x79adc4, 0xd6b473, 0xd68e83].map(
    (color) => new MeshStandardMaterial({ color, roughness: 0.58, side: FrontSide }),
  );
  const wire = new LineBasicMaterial({ color: 0x233946, transparent: true, opacity: 0.45 });
  const ghost = new LineBasicMaterial({ color: 0xd4e2ef, transparent: true, opacity: 0.35 });
  const inner = new LineBasicMaterial({ color: 0x9de1b2, depthTest: false, transparent: true, opacity: 0.7 });
  const params = {
    shape: "Box" as BevelShape,
    radius: 0.22,
    segments: 3,
    colors: true,
    wireframe: false,
    original: false,
    core: false,
    normals: false,
    status: "",
    triangles: "",
    patches: "",
  };
  const clear = () => {
    stage.traverse((o) => {
      if (o instanceof Mesh || o instanceof LineSegments) o.geometry.dispose();
    });
    stage.clear();
  };
  const rebuild = () => {
    clear();
    const source = bevelStudySource(params.shape);
    try {
      const result = bevelConvexGeometry(source, { radius: params.radius, segments: params.segments });
      stage.add(new Mesh(result.geometry, params.colors ? materials : materials[0]));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(result.geometry), wire));
      if (params.original) stage.add(new LineSegments(new EdgesGeometry(source), ghost));
      if (params.core) {
        const hull = new ConvexGeometry(result.core);
        stage.add(new LineSegments(new EdgesGeometry(hull), inner));
        hull.dispose();
      }
      if (params.normals) {
        const p = result.geometry.getAttribute("position"),
          n = result.geometry.getAttribute("normal"),
          points: Vector3[] = [];
        for (let i = 0; i < p.count; i += 3) {
          const center = new Vector3()
            .fromBufferAttribute(p, i)
            .add(new Vector3().fromBufferAttribute(p, i + 1))
            .add(new Vector3().fromBufferAttribute(p, i + 2))
            .divideScalar(3);
          points.push(center, center.clone().addScaledVector(new Vector3().fromBufferAttribute(n, i), 0.1));
        }
        stage.add(new LineSegments(new BufferGeometry().setFromPoints(points), inner));
      }
      params.status = `${result.faces} planes · ${result.core.length} corners`;
      params.triangles = `${result.geometry.getAttribute("position").count / 3} triangles`;
      params.patches = result.patches.join(" / ");
    } catch (error) {
      params.status = (error as Error).message;
      params.triangles = "No bevel output";
      params.patches = "";
      stage.add(new LineSegments(new EdgesGeometry(source), ghost));
    }
    source.dispose();
  };
  rebuild();
  frameObject(handle, stage, { fit: 1.2 });
  const gui = new GUI({ width: 350 });
  gui.title("Convex Bevel — study");
  gui
    .add(params, "shape", ["Box", "Tapered block", "Wedge", "Tetrahedron", "Octahedron", "Icosahedron"])
    .name("Source mesh")
    .onChange(rebuild);
  const bevel = gui.addFolder("All convex edges");
  bevel.add(params, "radius", 0, 0.65, 0.01).name("Bevel radius").onChange(rebuild);
  bevel.add(params, "segments", 1, 8, 1).name("Segments").onChange(rebuild);
  const inspect = gui.addFolder("Inspect — single sided");
  for (const [prop, label] of [
    ["colors", "Face / band / corner"],
    ["wireframe", "Wireframe"],
    ["original", "Original edges"],
    ["core", "Inset core"],
    ["normals", "Face normals"],
  ] as const)
    inspect.add(params, prop).name(label).onChange(rebuild);
  inspect.add({ frame: () => frameObject(handle, stage, { fit: 1.2 }) }, "frame").name("Frame study");
  const info = gui.addFolder("Measurements");
  info.add(params, "status").name("Topology").listen().disable();
  info.add(params, "triangles").name("Geometry").listen().disable();
  info.add(params, "patches").name("Face / band / corner").listen().disable();
  return () => {
    gui.destroy();
    clear();
    [...materials, wire, ghost, inner].forEach((m) => m.dispose());
    handle.dispose();
  };
}
