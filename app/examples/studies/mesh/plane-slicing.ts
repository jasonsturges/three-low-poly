import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  FrontSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Plane,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { sliceGeometry, thickenSurface, triangulateRegion } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Plane Slicing",
  description:
    "SDK-backed STUDY — split a closed triangle mesh with a movable plane. Blue is the positive half, terracotta " +
    "the negative half, and gold marks new caps. Every mesh material is single-sided. Separation moves " +
    "the finished halves for inspection; it does not change the cut. Try Perforated panel with the " +
    "default Z plane: the cap must retain the hole. Torus and Two boxes exercise multiple contours. " +
    "The plane is drawn as a grid; its arrow points toward the positive half. Normals and UVs are " +
    "interpolated on clipped edges, source material groups survive, and caps receive planar UVs. " +
    "Coplanar source faces belong to the half behind their outward normal. Tangent cuts add no cap. " +
    "Contour nesting distinguishes holes from separate islands. Ambiguous contours are reported, not " +
    "filled speculatively. This study assumes closed, consistently wound, non-self-intersecting inputs; " +
    "it is not a general boolean or mesh-repair tool. Features below the scale-relative weld tolerance " +
    "can collapse. Volume and edge checks are measurements, not a global validity certificate.",
};

export type SlicePreset = "Box" | "Sphere" | "Torus" | "Perforated panel" | "Two boxes";

export function slicingSource(preset: SlicePreset): BufferGeometry {
  if (preset === "Box") return new BoxGeometry(2.4, 1.8, 1.4);
  if (preset === "Sphere") return new SphereGeometry(1.3, 24, 12);
  if (preset === "Torus") return new TorusGeometry(1, 0.38, 12, 32);
  if (preset === "Two boxes") {
    const a = new BoxGeometry(1, 1.4, 1).translate(-0.9, 0, 0);
    const b = new BoxGeometry(1, 1.4, 1).translate(0.9, 0, 0);
    const result = mergeGeometries([a, b])!;
    a.dispose();
    b.dispose();
    return result;
  }
  const outline = [new Vector2(-1.5, -1), new Vector2(1.5, -1), new Vector2(1.5, 1), new Vector2(-1.5, 1)];
  const hole = Array.from(
    { length: 32 },
    (_, i) => new Vector2(Math.cos((i * Math.PI) / 16) * 0.55, Math.sin((i * Math.PI) / 16) * 0.55),
  );
  const region = triangulateRegion(outline, [hole]);
  return thickenSurface(
    {
      points: region.points.map((p) => new Vector3(p.x, p.y, 0)),
      triangles: region.triangles,
      uv: region.points.map((p) => new Vector2((p.x + 1.5) / 3, (p.y + 1) / 2)),
    },
    { thickness: 0.7 },
  ).geometry;
}

export function slicingVolume(geometry: BufferGeometry): number {
  const position = geometry.getAttribute("position"),
    index = geometry.index;
  let volume = 0;
  if (!position.count) return 0;
  const origin = new Vector3().fromBufferAttribute(position, 0);
  for (let i = 0; i < (index?.count ?? position.count); i += 3) {
    const p = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(position, index ? index.getX(i + k) : i + k).sub(origin));
    volume += p[0].dot(p[1].clone().cross(p[2])) / 6;
  }
  return volume;
}

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [3, 2, 5] });
  const key = new DirectionalLight(0xffeee0, 2);
  key.position.set(3, 4, 5);
  const fill = new DirectionalLight(0xb4ccff, 1.5);
  fill.position.set(-3, -2, -4);
  handle.scene.add(key, fill);
  const stage = new Group();
  handle.scene.add(stage);
  const blue = new MeshStandardMaterial({ color: 0x73adc9, roughness: 0.65, side: FrontSide });
  const red = new MeshStandardMaterial({ color: 0xc77559, roughness: 0.65, side: FrontSide });
  const gold = new MeshStandardMaterial({ color: 0xe8b45b, roughness: 0.6, side: FrontSide });
  const wire = new LineBasicMaterial({ color: 0x172632, transparent: true, opacity: 0.5 });
  const outline = new LineBasicMaterial({ color: 0xffda82 });
  const gridMat = new LineBasicMaterial({ color: 0x9bb4c5, transparent: true, opacity: 0.25 });
  const normalMat = new LineBasicMaterial({ color: 0xa7efb0 });
  const params = {
    source: "Perforated panel" as SlicePreset,
    yaw: 0,
    tilt: 0,
    distance: 0,
    separation: 0.85,
    view: "Both",
    caps: true,
    plane: true,
    contours: true,
    wireframe: false,
    normals: false,
    contoursReadout: "",
    volume: "",
    area: "",
    status: "",
  };
  const clear = () => {
    stage.traverse((o) => {
      if (o instanceof Mesh || o instanceof LineSegments) o.geometry.dispose();
    });
    stage.clear();
  };
  const rebuild = () => {
    clear();
    const source = slicingSource(params.source);
    const n = new Vector3(
      Math.sin(params.yaw) * Math.cos(params.tilt),
      Math.sin(params.tilt),
      Math.cos(params.yaw) * Math.cos(params.tilt),
    );
    const plane = new Plane(n, -params.distance);
    try {
      const result = sliceGeometry(source, plane, { cap: params.caps });
      const total = slicingVolume(source),
        remaining = slicingVolume(result.positive) + slicingVolume(result.negative);
      params.volume = params.caps
        ? `${((Math.abs(remaining - total) / total) * 100).toFixed(5)}% difference`
        : "Caps off: open surfaces";
      params.contoursReadout = `${result.loops.length} loops · ${result.holes} holes`;
      params.area = params.caps ? result.capArea.toFixed(5) : "Caps off";
      params.status = "Built · intersections not checked";
      for (const [half, geometry, material, sign] of [
        ["Positive", result.positive, blue, 1],
        ["Negative", result.negative, red, -1],
      ] as const) {
        if (params.view !== "Both" && params.view !== half) {
          geometry.dispose();
          continue;
        }
        const part = new Group();
        part.position.copy(n).multiplyScalar((sign * params.separation) / 2);
        stage.add(part);
        const materials = Array.from({ length: result.capMaterialIndex + 1 }, (_, i) =>
          i === result.capMaterialIndex ? gold : material,
        );
        part.add(new Mesh(geometry, materials));
        if (params.wireframe) part.add(new LineSegments(new WireframeGeometry(geometry), wire));
        if (params.contours) {
          const points = result.loops.flatMap((loop) => loop.flatMap((p, i) => [p, loop[(i + 1) % loop.length]]));
          part.add(new LineSegments(new BufferGeometry().setFromPoints(points), outline));
        }
        if (params.normals) {
          const p = geometry.getAttribute("position"),
            lines: Vector3[] = [];
          for (let i = 0; i < p.count; i += Math.max(1, Math.ceil(p.count / 3 / 90)) * 3) {
            const a = new Vector3().fromBufferAttribute(p, i),
              b = new Vector3().fromBufferAttribute(p, i + 1),
              c = new Vector3().fromBufferAttribute(p, i + 2);
            const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize(),
              center = a.clone().add(b).add(c).divideScalar(3);
            lines.push(center, center.clone().addScaledVector(normal, 0.13));
          }
          part.add(new LineSegments(new BufferGeometry().setFromPoints(lines), normalMat));
        }
      }
    } catch (error) {
      params.status = error instanceof Error ? error.message : String(error);
      params.contoursReadout = "Unresolved";
      params.volume = "—";
      params.area = "—";
      stage.add(new LineSegments(new WireframeGeometry(source), wire));
    }
    source.dispose();
    if (params.plane) {
      const seed = Math.abs(n.x) < 0.8 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0),
        u = seed.addScaledVector(n, -seed.dot(n)).normalize(),
        v = n.clone().cross(u),
        center = n.clone().multiplyScalar(params.distance);
      const point = (a: number, b: number) => center.clone().addScaledVector(u, a).addScaledVector(v, b),
        lines: Vector3[] = [];
      for (let i = -4; i <= 4; i++) {
        lines.push(point(i * 0.5, -2), point(i * 0.5, 2), point(-2, i * 0.5), point(2, i * 0.5));
      }
      lines.push(
        center,
        center.clone().addScaledVector(n, 0.65),
        center.clone().addScaledVector(n, 0.65),
        center.clone().addScaledVector(n, 0.48).addScaledVector(u, 0.07),
        center.clone().addScaledVector(n, 0.65),
        center.clone().addScaledVector(n, 0.48).addScaledVector(u, -0.07),
      );
      stage.add(new LineSegments(new BufferGeometry().setFromPoints(lines), gridMat));
    }
  };
  rebuild();
  frameObject(handle, stage, { fit: 1.05 });
  const gui = new GUI({ width: 330 });
  gui.title("Plane Slicing");
  gui.add(params, "source", ["Box", "Sphere", "Torus", "Perforated panel", "Two boxes"]).name("Source").onChange(rebuild);
  const cut = gui.addFolder("Cutting plane");
  cut.add(params, "yaw", -Math.PI, Math.PI, 0.01).name("Yaw").onChange(rebuild);
  cut
    .add(params, "tilt", -Math.PI / 2, Math.PI / 2, 0.01)
    .name("Tilt")
    .onChange(rebuild);
  cut.add(params, "distance", -2, 2, 0.01).name("Distance").onChange(rebuild);
  cut
    .add(
      {
        reset: () => {
          params.yaw = 0;
          params.tilt = 0;
          params.distance = 0;
          gui.controllersRecursive().forEach((c) => c.updateDisplay());
          rebuild();
        },
      },
      "reset",
    )
    .name("Reset plane");
  const inspect = gui.addFolder("Inspect — single sided");
  inspect.add(params, "view", ["Both", "Positive", "Negative"]).name("Half").onChange(rebuild);
  inspect.add(params, "separation", 0, 2, 0.01).name("Separation").onChange(rebuild);
  for (const [property, label] of [
    ["caps", "Caps"],
    ["plane", "Plane grid"],
    ["contours", "Cut outlines"],
    ["wireframe", "Wireframe"],
    ["normals", "Face normals"],
  ] as const)
    inspect.add(params, property).name(label).onChange(rebuild);
  inspect.add({ frame: () => frameObject(handle, stage, { fit: 1.05 }) }, "frame").name("Frame study");
  const readout = gui.addFolder("Measurements");
  readout.add(params, "contoursReadout").name("Contours").listen().disable();
  readout.add(params, "area").name("Cap area / half").listen().disable();
  readout.add(params, "volume").name("Volume sum").listen().disable();
  readout.add(params, "status").name("Status").listen().disable();
  return () => {
    gui.destroy();
    clear();
    [blue, red, gold, wire, outline, gridMat, normalMat].forEach((m) => m.dispose());
    handle.dispose();
  };
}
