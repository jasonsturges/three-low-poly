import GUI from "lil-gui";
import {
  ArrowHelper,
  AxesHelper,
  BufferGeometry,
  GridHelper,
  Line,
  LineBasicMaterial,
  SphereGeometry,
  Sprite,
  DoubleSide,
  MeshBasicMaterial,
  PlaneGeometry,
  HemisphereLight,
} from "three";
import { Box3, Box3Helper, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { alignToEdge, alignToRow, centerObject, BoxSide } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { createTextSprite } from "../../../framework/createTextSprite";

export const meta = {
  title: "Shelf Layout",
  description:
    "STUDY — seeded objects with offset geometry origins and independent transformed parents. " +
    "Row packs projected world AABB intervals, Edge matches the outermost face, and Center places the assembly. " +
    "Gold boxes expose the placement envelope. Negative and diagonal directions test projected widths. " +
    "The shelf composition uses row → bottom alignment → optional depth alignment → assembly centering; it is a layout operation, not a bin-packing solver. " +
    "The reported residual independently measures the requested constraint. All experiment construction and measurements stay inline.",
};

export default function (container: HTMLElement) {
  const view = createScene(container, { background: 0x18232e, cameraPosition: [10, 8, 12] });
  view.scene.add(new HemisphereLight(0xe4f0ff, 0x59645b, 2.5));
  const gui = new GUI({ container, title: "Placement / shelf" });
  gui.domElement.style.cssText = "position:absolute;top:12px;right:12px;z-index:5";
  const settings = {
    seed: 17,
    operation: "Shelf",
    direction: "+X",
    gap: 0.35,
    parents: true,
    drift: 1,
    bounds: true,
    alignmentGuide: true,
    autoFrame: true,
    beforeBounds: true,
    side: "front",
    depthAlignment: "Front (+Z)",
  };
  const readout = document.createElement("div");
  readout.style.cssText = "padding:10px;white-space:pre-wrap;line-height:1.5;font-size:12px";
  readout.setAttribute("role", "status");
  let root = new Group();
  let framingBox = new Box3();
  function frameLayout() {
    if (framingBox.isEmpty()) return;
    const proxy = new Mesh(new BoxGeometry(...framingBox.getSize(new Vector3()).toArray()));
    const center = framingBox.getCenter(new Vector3());
    proxy.position.copy(center);
    // Preserve the orbit direction when the target moves.
    view.camera.position.add(center.clone().sub(view.controls.target));
    // Account for narrow viewers as well as vertical FOV.
    frameObject(view, proxy, { fit: 1.45 / Math.min(1, view.camera.aspect) });
    proxy.geometry.dispose();
    (proxy.material as MeshBasicMaterial).dispose();
  }
  function directionArrow(
    direction: Vector3,
    origin: Vector3,
    length: number,
    color: number,
    headLength: number,
    headWidth: number,
  ) {
    const arrow = new ArrowHelper(direction, origin, length, color, headLength, headWidth);
    // ArrowHelper shares default geometry globally. Own copies for rebuild disposal.
    arrow.line.geometry = arrow.line.geometry.clone();
    arrow.cone.geometry = arrow.cone.geometry.clone();
    return arrow;
  }
  function marker(position: Vector3, color: number, label: string, labelHeight = 0.35) {
    const dot = new Mesh(new SphereGeometry(0.085, 12, 8), new MeshBasicMaterial({ color, depthTest: false }));
    dot.position.copy(position);
    dot.renderOrder = 20;
    root.add(dot);
    const text = createTextSprite(label, { scale: 0.35 });
    text.position.copy(position).add(new Vector3(0, labelHeight, 0));
    text.material.depthTest = false;
    text.renderOrder = 21;
    root.add(text);
  }
  function release() {
    root.traverse((o) => {
      if (o instanceof Sprite) o.material.map?.dispose();
      const drawable = o as Mesh;
      // Sprite geometry is also shared by Three.js; only its material/texture are owned here.
      if (!(o instanceof Sprite)) drawable.geometry?.dispose();
      if (drawable.material)
        (Array.isArray(drawable.material) ? drawable.material : [drawable.material]).forEach((m) => m.dispose());
    });
    root.removeFromParent();
  }
  function rebuild() {
    release();
    root = new Group();
    view.scene.add(root);
    // Local seeded generator makes the fixture independent of SDK random utilities.
    let seed = settings.seed;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const assembly = new Group();
    root.add(assembly);
    const objects = Array.from({ length: 5 }, (_, i) => {
      const parent = new Group();
      assembly.add(parent);
      // Consume the same seed values with parents on or off, keeping geometry stable.
      const parentPosition = new Vector3(random() * 3, random(), random());
      const parentYaw = random() * 0.7;
      const parentScale = new Vector3(0.8 + random() * 0.5, 0.8 + random() * 0.5, 1.1);
      if (settings.parents) {
        parent.position.copy(parentPosition);
        parent.rotation.set(0.1 * settings.drift, parentYaw * settings.drift, 0.15 * settings.drift);
        parent.scale.copy(parentScale);
      }
      const geometry = new BoxGeometry(0.5 + random(), 0.7 + random() * 1.6, 0.7 + random());
      geometry.translate(0.4, 0.3, -0.2);
      const mesh = new Mesh(
        geometry,
        new MeshStandardMaterial({ color: [0x79bec4, 0xe4ac65, 0xc57864, 0x91ae77, 0x9b91c9][i], roughness: 0.7 }),
      );
      const rotation = random() * 0.6;
      mesh.rotation.y = rotation * settings.drift;
      mesh.position.set(i * 1.6 - 4, random() * 2, random() * 2 - 1);
      parent.add(mesh);
      return mesh;
    });
    const directions: Record<string, Vector3> = {
      "+X": new Vector3(1, 0, 0),
      "−X": new Vector3(-1, 0, 0),
      Diagonal: new Vector3(1, 0, -1).normalize(),
    };
    // Flush Z faces and a diagonal XZ row impose competing constraints.
    // The shelf uses X; standalone Row retains signed and diagonal experiments.
    const direction = settings.operation === "Shelf" ? directions["+X"] : directions[settings.direction];
    const bounds = () =>
      objects.map((o) => {
        o.updateWorldMatrix(true, true);
        return new Box3().setFromObject(o, true);
      });
    const initialSelection = bounds().reduce((box, item) => box.union(item), new Box3());
    let expected = 0;
    const axis =
      settings.side === "left" || settings.side === "right"
        ? "x"
        : settings.side === "top" || settings.side === "bottom"
          ? "y"
          : "z";
    const end = ["left", "bottom", "back"].includes(settings.side) ? "min" : "max";
    if (settings.operation === "Edge") {
      // Snapshot the selection before movement. Guides never participate in SDK bounds.
      const initialBounds = bounds();
      const selection = initialBounds.reduce((box, item) => box.union(item), new Box3());
      expected = selection[end][axis];
      alignToEdge(objects, settings.side as BoxSide);
      if (settings.alignmentGuide) {
        const ghost = new Box3Helper(selection.clone(), 0x9cacba);
        for (const material of Array.isArray(ghost.material) ? ghost.material : [ghost.material]) {
          material.transparent = true;
          material.opacity = 0.35;
          material.depthWrite = false;
        }
        root.add(ghost);

        const size = selection.getSize(new Vector3());
        const center = selection.getCenter(new Vector3());
        center[axis] = expected;
        const width = axis === "x" ? size.z : size.x;
        const height = axis === "y" ? size.z : size.y;
        const plane = new Mesh(
          new PlaneGeometry(width, height),
          new MeshBasicMaterial({ color: 0x59dfea, transparent: true, opacity: 0.14, side: DoubleSide, depthWrite: false }),
        );
        plane.position.copy(center);
        if (axis === "x") plane.rotation.y = Math.PI / 2;
        if (axis === "y") plane.rotation.x = -Math.PI / 2;
        root.add(plane);
        const face = selection.clone();
        face.min[axis] = face.max[axis] = expected;
        root.add(new Box3Helper(face, 0x59dfea));
      }
    } else if (settings.operation === "Center") centerObject(assembly, new Vector3(0, 2, 0));
    else {
      alignToRow(objects, direction, settings.gap, new Vector3());
      if (settings.operation === "Shelf") {
        alignToEdge(objects, BoxSide.BOTTOM);
        if (settings.depthAlignment !== "Centered") {
          alignToEdge(objects, settings.depthAlignment === "Front (+Z)" ? BoxSide.FRONT : BoxSide.BACK);
        }
        centerObject(assembly);
        const box = new Box3().setFromObject(assembly, true);
        assembly.position.y -= box.min.y;
        assembly.updateWorldMatrix(true, true);
      }
    }
    const boxes = bounds();
    const finalSelection = boxes.reduce((box, item) => box.union(item), new Box3());
    framingBox = finalSelection.clone();
    if (settings.operation === "Edge" && settings.alignmentGuide) framingBox.union(initialSelection);
    if (settings.operation === "Row") {
      const origin = new Vector3();
      const absoluteDirection = new Vector3(...direction.toArray().map(Math.abs));
      const length =
        boxes.reduce((sum, box) => sum + box.getSize(new Vector3()).dot(absoluteDirection), 0) +
        settings.gap * (boxes.length - 1);
      const arrowLength = length + 0.8;
      root.add(directionArrow(direction, origin, arrowLength, 0x59dfea, 0.35, 0.18));
      root.add(new AxesHelper(0.7));
      marker(origin, 0x76f4a2, "Origin (0, 0, 0)");
      framingBox.expandByPoint(origin).expandByPoint(direction.clone().multiplyScalar(arrowLength));
    }
    if (settings.operation === "Center") {
      const target = new Vector3(0, 2, 0);
      const previousCenter = initialSelection.getCenter(new Vector3());
      root.add(new Box3Helper(finalSelection.clone(), 0x59dfea));
      marker(target, 0x76f4a2, "Center target (0, 2, 0)");
      if (settings.beforeBounds) {
        const ghost = new Box3Helper(initialSelection.clone(), 0x9cacba);
        for (const material of Array.isArray(ghost.material) ? ghost.material : [ghost.material]) {
          material.transparent = true;
          material.opacity = 0.35;
          material.depthWrite = false;
        }
        root.add(ghost);
        marker(previousCenter, 0xe4ac65, "Previous center", 1.1);
        const delta = target.clone().sub(previousCenter);
        if (delta.length() > 1e-8)
          root.add(directionArrow(delta.clone().normalize(), previousCenter, delta.length(), 0xe4ac65, 0.25, 0.12));
        framingBox.union(initialSelection);
      }
      // Ground is only a height reference. Centering does not put the object on it.
      const grid = new GridHelper(12, 12, 0x425b69, 0x2c3b49);
      root.add(grid, new AxesHelper(0.7));
      const heightLine = new Line(
        new BufferGeometry().setFromPoints([new Vector3(), target]),
        new LineBasicMaterial({ color: 0x76f4a2 }),
      );
      root.add(heightLine);
      marker(new Vector3(), 0x9cacba, "World origin (0, 0, 0)");
      framingBox.expandByPoint(new Vector3());
    }
    const absolute = new Vector3(Math.abs(direction.x), Math.abs(direction.y), Math.abs(direction.z));
    let error = 0;
    if (settings.operation === "Edge") error = Math.max(...boxes.map((b) => Math.abs(b[end][axis] - expected)));
    else if (settings.operation === "Center")
      error = new Box3()
        .setFromObject(assembly, true)
        .getCenter(new Vector3())
        .distanceTo(new Vector3(0, 2, 0));
    else {
      for (let i = 1; i < boxes.length; i++) {
        const previous = boxes[i - 1],
          current = boxes[i];
        const gap =
          current.getCenter(new Vector3()).sub(previous.getCenter(new Vector3())).dot(direction) -
          (current.getSize(new Vector3()).dot(absolute) + previous.getSize(new Vector3()).dot(absolute)) / 2;
        error = Math.max(error, Math.abs(gap - settings.gap));
      }
      if (settings.operation === "Shelf") {
        error = Math.max(error, ...boxes.map((b) => Math.abs(b.min.y)));
        if (settings.depthAlignment !== "Centered") {
          const faces = boxes.map((b) => (settings.depthAlignment === "Front (+Z)" ? b.max.z : b.min.z));
          error = Math.max(error, Math.max(...faces) - Math.min(...faces));
        }
      }
    }
    if (settings.bounds) boxes.forEach((b) => root.add(new Box3Helper(b, 0xf1d186)));
    if (settings.operation === "Shelf") {
      const shelf = new Mesh(new BoxGeometry(14, 0.22, 12), new MeshStandardMaterial({ color: 0x344552, roughness: 1 }));
      shelf.position.y = -0.11;
      root.add(shelf);
    }
    const explanations: Record<string, string> = {
      Shelf: `1. alignToRow(items, +X, gap)
2. alignToEdge(items, BOTTOM)
${settings.depthAlignment === "Centered" ? "3. Keep depth centers aligned" : `3. alignToEdge(items, ${settings.depthAlignment === "Front (+Z)" ? "FRONT" : "BACK"})`}
4. centerObject(assembly), then rest on shelf

World bounding boxes ${settings.depthAlignment === "Centered" ? "share a depth center" : "share a flush depth plane"}. Rotated object faces need not be coplanar.`,
      Row: `alignToRow(items, direction, gap)

Green marks the world origin; the cyan arrow shows the row direction and center line. The first bounding interval begins at the origin.

Orders objects along a line with equal gaps between bounds. Their centers lie on that line; their front faces need not be flush. Unequal widths mean unequal center distances.`,
      Edge: `alignToEdge(items, side)

Target: ${axis.toUpperCase()} = ${expected.toFixed(3)} (original ${settings.side} extent).

Cyan = selected alignment plane. Faint gray = combined bounds BEFORE movement, not a container. Each object's chosen bounding face moves to that plane; other axes stay put. Overlap is possible.

Changing the face rebuilds the same seeded starting arrangement, then applies that alignment.`,
      Center: `centerObject(assembly, (0, 2, 0))

Green = target and final bounds center. Cyan box = entire assembly after centering. Gray box and amber arrow show the previous bounds and center movement.

Moves the whole assembly, not each object's center. Relative positions and any existing overlaps stay unchanged. The Y = 0 grid is only a height reference; the target is two units above it.`,
    };
    readout.textContent = `${explanations[settings.operation]}

World axes: X = left/right, Y = bottom/top, Z = back/front.
Gold = world bounding boxes.
Rotation drift: 0 = upright, 1 = original offsets, 2 = doubled.
Maximum constraint error: ${error.toExponential(2)}`;
    if (settings.autoFrame) frameLayout();
  }
  gui
    .add(settings, "operation", {
      "Shelf: row + aligned faces": "Shelf",
      "Row only: equal gaps": "Row",
      "Edge only: flush faces": "Edge",
      "Center assembly": "Center",
    })
    .name("Operation")
    .onChange(() => {
      updateControls();
      rebuild();
    });
  gui.add(settings, "seed", 1, 100, 1).name("Seed").onChange(rebuild);
  const directionControl = gui.add(settings, "direction", ["+X", "−X", "Diagonal"]).name("Row direction").onChange(rebuild);
  const gapControl = gui.add(settings, "gap", 0, 1, 0.05).name("Gap").onChange(rebuild);
  const sideControl = gui
    .add(settings, "side", {
      "Left (−X)": "left",
      "Right (+X)": "right",
      "Bottom (−Y)": "bottom",
      "Top (+Y)": "top",
      "Back (−Z)": "back",
      "Front (+Z)": "front",
    })
    .name("Align face")
    .onChange(rebuild);
  const depthControl = gui
    .add(settings, "depthAlignment", ["Front (+Z)", "Back (−Z)", "Centered"])
    .name("Depth alignment")
    .onChange(rebuild);
  gui.add(settings, "drift", 0, 2, 0.05).name("Rotation drift").onChange(rebuild);
  gui.add(settings, "parents").name("Transformed parents").onChange(rebuild);
  gui.add(settings, "bounds").name("Show bounds").onChange(rebuild);
  const guideControl = gui.add(settings, "alignmentGuide").name("Alignment guide").onChange(rebuild);
  const beforeControl = gui.add(settings, "beforeBounds").name("Before bounds").onChange(rebuild);
  gui
    .add(settings, "autoFrame")
    .name("Auto frame")
    .onChange(() => {
      if (settings.autoFrame) frameLayout();
    });
  gui.add({ frameLayout }, "frameLayout").name("Frame layout");
  function updateControls() {
    directionControl.show(settings.operation === "Row");
    gapControl.show(settings.operation === "Row" || settings.operation === "Shelf");
    sideControl.show(settings.operation === "Edge");
    guideControl.show(settings.operation === "Edge");
    depthControl.show(settings.operation === "Shelf");
    beforeControl.show(settings.operation === "Center");
  }
  const information = gui.addFolder("Operation explained");
  information.$children.append(readout);
  updateControls();
  rebuild();
  return () => {
    gui.destroy();
    readout.remove();
    release();
    view.dispose();
  };
}
