import GUI from "lil-gui";
import { HemisphereLight } from "three";
import {
  Box3,
  Box3Helper,
  BoxGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Raycaster,
  SphereGeometry,
  Vector3,
} from "three";
import {
  alignObjectToSurface,
  alignInstancedMeshIndexToSurface,
  alignInstancedMeshToSurface,
  findClosestVertexWorld,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Surface Contact",
  description:
    "STUDY — compare a flat desk with a triangulated terrain, whole-batch placement with per-instance placement, " +
    "and center-ray contact with a sampled footprint. Gold marks bounds; green marks the chosen target. " +
    "Surface helpers translate a world AABB bottom center to a known point. Ray queries and footprint sampling remain inline here. " +
    "One center ray can bury the uphill side; a 5×5 maximum-height sample reduces penetration but is not a continuous collision guarantee. " +
    "The magenta marker is the closest stored terrain vertex, not a ray hit or closest triangle point. " +
    "Objects remain upright relative to their existing transforms: no normal alignment or physics is implied.",
};

export default function (container: HTMLElement) {
  const view = createScene(container, { background: 0x18232e, cameraPosition: [9, 7, 10] });
  view.scene.add(new HemisphereLight(0xe4f0ff, 0x59645b, 2.5));
  const gui = new GUI({ container, title: "Placement / contact" });
  gui.domElement.style.cssText = "position:absolute;top:12px;right:12px;z-index:5";
  const info = document.createElement("div");
  info.style.cssText = "padding:10px;white-space:pre-wrap;line-height:1.5;font-size:12px";
  info.setAttribute("role", "status");
  const settings = { surface: "Terrain", mode: "Object", contact: "Center ray", x: 0, z: 0, parents: true, bounds: true };
  let root = new Group();
  function release() {
    const geometries = new Set<any>(),
      materials = new Set<any>();
    root.traverse((o) => {
      const m = o as Mesh;
      if (m.geometry) geometries.add(m.geometry);
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((v) => materials.add(v));
      if ((o as InstancedMesh).isInstancedMesh) (o as InstancedMesh).dispose();
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    root.removeFromParent();
  }
  function rebuild() {
    release();
    root = new Group();
    view.scene.add(root);
    const geometry = new PlaneGeometry(14, 12, 36, 32);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = positions.getZ(i);
      positions.setY(i, settings.surface === "Desk" ? 0 : 0.6 * Math.sin(x * 0.85) + 0.3 * Math.cos(z * 1.2));
    }
    geometry.computeVertexNormals();
    const terrain = new Mesh(geometry, new MeshStandardMaterial({ color: 0x4c6865, roughness: 1, side: DoubleSide }));
    root.add(terrain);
    terrain.updateWorldMatrix(true, false);
    const ray = new Raycaster();
    // Query actual rendered triangles, rather than the analytic height formula.
    const height = (x: number, z: number) => {
      ray.set(new Vector3(x, 10, z), new Vector3(0, -1, 0));
      return ray.intersectObject(terrain, false)[0]?.point.y ?? 0;
    };
    const parent = new Group();
    root.add(parent);
    if (settings.parents) {
      parent.position.set(1, 0.7, -0.5);
      parent.rotation.y = 0.4;
      parent.scale.set(1.15, 0.85, 0.9);
    }
    const block = new BoxGeometry(1.6, 1.4, 1.2);
    block.translate(0.35, 0.2, -0.15);
    const material = new MeshStandardMaterial({ color: 0xe2b577, roughness: 0.65 });
    const instanceMode = settings.mode !== "Object";
    const object = instanceMode ? new InstancedMesh(block, material, 3) : new Mesh(block, material);
    parent.add(object);
    if (object instanceof InstancedMesh)
      for (let i = 0; i < 3; i++) object.setMatrixAt(i, new Matrix4().makeTranslation((i - 1) * 2.3, i * 0.4, 0));
    object.updateWorldMatrix(true, true);
    const getBox = (index?: number) => {
      if (object instanceof InstancedMesh && index !== undefined) {
        const matrix = new Matrix4();
        object.getMatrixAt(index, matrix);
        block.computeBoundingBox();
        return block.boundingBox!.clone().applyMatrix4(new Matrix4().multiplyMatrices(object.matrixWorld, matrix));
      }
      return new Box3().setFromObject(object, true);
    };
    let maxAnchorError = 0,
      maxPenetration = 0;
    const targets: Vector3[] = [];
    const place = (index?: number) => {
      const before = getBox(index),
        size = before.getSize(new Vector3());
      const x = settings.x + (index === undefined ? 0 : (index - 1) * 2.6),
        z = settings.z;
      let y = height(x, z);
      if (settings.contact === "Footprint samples")
        for (let i = 0; i <= 4; i++)
          for (let j = 0; j <= 4; j++) y = Math.max(y, height(x + (i / 4 - 0.5) * size.x, z + (j / 4 - 0.5) * size.z));
      const target = new Vector3(x, y, z);
      targets.push(target);
      if (object instanceof InstancedMesh) {
        if (index === undefined) alignInstancedMeshToSurface(object, target);
        else alignInstancedMeshIndexToSurface(object, target, index);
      } else alignObjectToSurface(object, target);
      const after = getBox(index),
        anchor = after.getCenter(new Vector3());
      anchor.y = after.min.y;
      maxAnchorError = Math.max(maxAnchorError, anchor.distanceTo(target));
      // Denser, independent validation samples illustrate what the 5×5 solver can miss.
      for (let i = 0; i <= 20; i++)
        for (let j = 0; j <= 20; j++)
          maxPenetration = Math.max(
            maxPenetration,
            height(after.min.x + (size.x * i) / 20, after.min.z + (size.z * j) / 20) - after.min.y,
          );
      if (settings.bounds) root.add(new Box3Helper(after, 0xf1d186));
    };
    if (settings.mode === "Per instance") for (let i = 0; i < 3; i++) place(i);
    else place();
    const marker = (position: Vector3, color: number) => {
      const mesh = new Mesh(
        new SphereGeometry(0.075, 12, 8),
        new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, depthTest: false, depthWrite: false }),
      );
      mesh.renderOrder = 10;
      mesh.position.copy(position);
      root.add(mesh);
    };
    targets.forEach((t) => marker(t, 0x76f4a2));
    const closest = findClosestVertexWorld(targets[0], terrain);
    if (closest) marker(closest, 0xf28bdf);
    info.textContent = `${settings.mode} · ${settings.contact}\nAnchor error: ${maxAnchorError.toExponential(2)}\nSampled AABB penetration: ${maxPenetration.toFixed(4)}\nGreen = target · magenta = nearest vertex`;
  }
  gui.add(settings, "surface", ["Desk", "Terrain"]).onChange(rebuild);
  gui.add(settings, "mode", ["Object", "Whole batch", "Per instance"]).onChange(rebuild);
  gui.add(settings, "contact", ["Center ray", "Footprint samples"]).onChange(rebuild);
  gui.add(settings, "x", -1.5, 1.5, 0.1).onChange(rebuild);
  gui.add(settings, "z", -2, 2, 0.1).onChange(rebuild);
  gui.add(settings, "parents").onChange(rebuild);
  gui.add(settings, "bounds").onChange(rebuild);
  const information = gui.addFolder("Placement readout");
  information.$children.append(info);
  rebuild();
  return () => {
    gui.destroy();
    info.remove();
    release();
    view.dispose();
  };
}
