import GUI from "lil-gui";
import { type Box3, type BufferGeometry, Group, Mesh, MeshStandardMaterial, type Sprite } from "three";
import {
  GroundGrid,
  HEADSTONE_CATALOG,
  type HeadstoneFamily,
  TABLET_HEADSTONE_DEFAULTS,
  TabletHeadstoneGeometry,
  type TabletShoulder,
  type TabletTop,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { createTextSprite } from "../../../framework/createTextSprite";
import type { ExampleMeta, ExampleMount } from "../../../framework/example";
import { frameObject } from "../../../framework/frameObject";

export const meta: ExampleMeta = {
  title: "Headstone Gallery",
  description:
    "The whole HEADSTONE_CATALOG, one stone per entry. Rows of TABLETS — the stonecutter's chart of tops, every " +
    "one a (top × shoulder) pairing of one outline builder — then the CROSSES and OBELISKS, then the MONUMENTS " +
    "assembled from the mason's kit: moulded plinths, dies, cornices, turned urns and columns, lofted lids. Every " +
    "stone is one geometry for one material, base at y = 0, face toward +Z. The Workbench folder builds a tablet " +
    "from the outline's real options, in amber at the end of the first row.",
};

const TOPS: TabletTop[] = ["flat", "camber", "oval", "halfRound", "pointed", "ogeeArch", "ogee", "serpentine", "halfOgee", "peon"];
const SHOULDERS: TabletShoulder[] = ["none", "ledge", "checked", "rounded", "doubleRounded", "scotia", "splayed", "gothic"];
const FAMILIES: HeadstoneFamily[] = ["tablet", "cross", "obelisk", "monument"];

const mount: ExampleMount = (container) => {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [2, 3.2, 9] });
  const { scene } = handle;
  let gridSize = 16;
  let grid = new GroundGrid({ size: gridSize, divisions: gridSize * 2 });
  scene.add(grid);

  const stone = new MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.92, flatShading: true });
  const bench = new MeshStandardMaterial({ color: 0xc9a36a, roughness: 0.92, flatShading: true });
  const stage = new Group();
  scene.add(stage);

  const params = {
    showLabels: true,
    family: "all" as "all" | HeadstoneFamily,
    focus: "(all)",
    /** `front` looks straight at the faces — for reading silhouettes against the chart. */
    view: "perspective" as "perspective" | "front",
    //  The workbench tablet — real option names.
    top: "oval" as TabletTop,
    shoulder: "scotia" as TabletShoulder,
    rightShoulder: "(mirror)" as TabletShoulder | "(mirror)",
    width: TABLET_HEADSTONE_DEFAULTS.width,
    height: TABLET_HEADSTONE_DEFAULTS.height,
    rise: TABLET_HEADSTONE_DEFAULTS.rise,
    peak: TABLET_HEADSTONE_DEFAULTS.peak,
    shoulderWidth: TABLET_HEADSTONE_DEFAULTS.shoulderWidth,
    shoulderDrop: TABLET_HEADSTONE_DEFAULTS.shoulderDrop,
    gothicSpring: TABLET_HEADSTONE_DEFAULTS.gothicSpring,
    depth: TABLET_HEADSTONE_DEFAULTS.depth,
    bevel: TABLET_HEADSTONE_DEFAULTS.bevel,
    segments: TABLET_HEADSTONE_DEFAULTS.segments,
  };
  const readout = { stones: "", triangles: "", workbench: "" };

  const triangles = (g: BufferGeometry) => (g.index ? g.index.count : g.getAttribute("position").count) / 3;

  function label(text: string, x: number, z: number, color = "#9aa3ad"): Sprite {
    const sprite = createTextSprite(text, { size: 44, scale: 0.09, color, x, y: 0.03, z });
    sprite.center.set(0.5, 0);
    return sprite;
  }

  function clear(): void {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh) child.geometry.dispose();
      else {
        const sprite = child as Sprite;
        sprite.material.map?.dispose();
        sprite.material.dispose();
      }
      stage.remove(child);
    }
  }

  /** A stone ready to lay out: its geometry, measured, and how it is drawn and labelled. */
  interface Item {
    g: BufferGeometry;
    material: MeshStandardMaterial;
    text: string;
    color?: string;
  }

  /**
   * Lay the items out in rows no wider than {@link ROW_WIDTH}, each stone spaced by its own measured width
   * and each row as deep as its deepest stone. A family always starts a new row, behind the last, with an
   * aisle between — tablets at the front, monuments at the back, so the tall do not hide the short.
   * Returns the occupied extent, so the grid can be fitted to it.
   */
  const ROW_WIDTH = 9.6;
  function layOut(families: Item[][]): { width: number; depth: number } {
    const gap = 0.4;
    //  Between rows of one family, and the wider aisle where one family gives way to the next.
    const rowGap = 0.9;
    const aisle = 1.4;
    const rows: { items: { item: Item; box: Box3 }[]; width: number; depth: number }[] = [];
    const aisles: number[] = [];
    for (const items of families) {
      if (items.length === 0) continue;
      if (rows.length) aisles[rows.length] = aisle;
      let row: (typeof rows)[number] | undefined;
      for (const item of items) {
        item.g.computeBoundingBox();
        const box = item.g.boundingBox!;
        const w = box.max.x - box.min.x;
        if (!row || row.width + gap + w > ROW_WIDTH) {
          if (row) aisles[rows.length] = rowGap;
          rows.push((row = { items: [], width: -gap, depth: 0 }));
        }
        row.items.push({ item, box });
        row.width += gap + w;
        row.depth = Math.max(row.depth, box.max.z - box.min.z);
      }
    }
    //  Each row's depth plus room for its labels in front, rows running back toward −Z.
    const labelRoom = params.showLabels ? 0.45 : 0.25;
    let z = 0;
    let width = 0;
    const placed: { item: Item; box: Box3; x: number; z: number }[] = [];
    rows.forEach((row, i) => {
      z -= aisles[i] ?? 0;
      const front = z;
      z -= labelRoom + row.depth;
      const centre = front - labelRoom - row.depth / 2;
      let cursor = -row.width / 2;
      for (const { item, box } of row.items) {
        placed.push({ item, box, x: cursor - box.min.x, z: centre - (box.min.z + box.max.z) / 2 });
        cursor += box.max.x - box.min.x + gap;
      }
      width = Math.max(width, row.width);
    });
    //  Centre the whole layout on the origin, front to back.
    const shift = -z / 2;
    for (const { item, box, x, z: rowZ } of placed) {
      const mesh = new Mesh(item.g, item.material);
      mesh.position.set(x, 0, rowZ + shift);
      mesh.castShadow = mesh.receiveShadow = true;
      stage.add(mesh);
      if (params.showLabels) stage.add(label(item.text, x, rowZ + shift + box.max.z + 0.22, item.color));
      readout.triangles = `${Number(readout.triangles) + triangles(item.g)}`;
    }
    return { width, depth: -z };
  }

  function rebuild(): void {
    clear();
    readout.triangles = "0";
    const shown = HEADSTONE_CATALOG.filter(
      (e) => (params.family === "all" || e.family === params.family) && (params.focus === "(all)" || e.name === params.focus),
    );
    const items = (family: HeadstoneFamily[]): Item[] =>
      shown.filter((e) => family.includes(e.family)).map((e) => ({ g: e.build(), material: stone, text: e.label }));

    const tablets = items(["tablet"]);
    //  The workbench tablet, in amber, at the end of the tablets.
    if (params.focus === "(all)" && (params.family === "all" || params.family === "tablet")) {
      const g = new TabletHeadstoneGeometry({
        top: params.top,
        shoulder: params.shoulder,
        rightShoulder: params.rightShoulder === "(mirror)" ? null : params.rightShoulder,
        width: params.width,
        height: params.height,
        rise: params.rise,
        peak: params.peak,
        shoulderWidth: params.shoulderWidth,
        shoulderDrop: params.shoulderDrop,
        gothicSpring: params.gothicSpring,
        depth: params.depth,
        bevel: params.bevel,
        segments: params.segments,
      });
      readout.workbench = `${triangles(g)} tris · ${g.height.toFixed(2)} m tall`;
      tablets.push({ g, material: bench, text: `${params.top} × ${params.shoulder}`, color: "#e0b878" });
    }
    const extent = layOut([tablets, items(["cross", "obelisk"]), items(["monument"])]);
    fitGrid(extent);
    readout.stones = `${shown.length} of ${HEADSTONE_CATALOG.length}`;
  }

  /** A grid just larger than what stands on it, in half-metre cells. */
  function fitGrid({ width, depth }: { width: number; depth: number }): void {
    const size = Math.max(4, Math.ceil(Math.max(width, depth) + 2));
    if (size === gridSize) return;
    scene.remove(grid);
    grid.dispose();
    gridSize = size;
    grid = new GroundGrid({ size, divisions: size * 2 });
    scene.add(grid);
  }

  //  `?family=tablet&view=front` or `?focus=cross/celtic` opens straight onto a subset — for captures.
  const query = new URLSearchParams(location.search);
  const family = query.get("family") as HeadstoneFamily | null;
  if (family && FAMILIES.includes(family)) params.family = family;
  if (query.get("view") === "front") params.view = "front";
  const focus = query.get("focus");
  if (focus && HEADSTONE_CATALOG.some((e) => e.name === focus)) params.focus = focus;

  const refocus = () => {
    rebuild();
    const { camera, controls } = handle;
    const box = stage.children.length ? stage : grid;
    controls.target.set(0, 0, 0);
    //  Front: raised just enough that the back rows' tops clear the front row's.
    if (params.view === "front") camera.position.set(controls.target.x, controls.target.y + 4.5, controls.target.z + 10);
    else camera.position.set(controls.target.x + 2, controls.target.y + 5.5, controls.target.z + 9);
    frameObject(handle, box, { fit: params.focus === "(all)" ? 0.95 : 2 });
  };
  refocus();

  const gui = new GUI({ title: "Headstone Gallery" });
  gui.add(params, "showLabels").onChange(rebuild);
  gui.add(params, "family", ["all", ...FAMILIES]).onChange(refocus);
  gui.add(params, "focus", ["(all)", ...HEADSTONE_CATALOG.map((e) => e.name)]).onChange(refocus);
  gui.add(params, "view", ["perspective", "front"]).onChange(refocus);
  const work = gui.addFolder("Workbench");
  work.add(params, "top", TOPS).onChange(rebuild);
  work.add(params, "shoulder", SHOULDERS).onChange(rebuild);
  work.add(params, "rightShoulder", ["(mirror)", ...SHOULDERS]).onChange(rebuild);
  work.add(params, "width", 0.3, 1.2, 0.01).onChange(rebuild);
  work.add(params, "height", 0.3, 1.4, 0.01).onChange(rebuild);
  work.add(params, "rise", 0, 0.5, 0.005).onChange(rebuild);
  work.add(params, "peak", 0.05, 0.95, 0.01).onChange(rebuild);
  work.add(params, "shoulderWidth", 0.01, 0.3, 0.005).onChange(rebuild);
  work.add(params, "shoulderDrop", 0, 0.2, 0.005).onChange(rebuild);
  work.add(params, "gothicSpring", 0.05, 0.95, 0.01).onChange(rebuild);
  work.add(params, "depth", 0.04, 0.3, 0.005).onChange(rebuild);
  work.add(params, "bevel", 0, 0.03, 0.001).onChange(rebuild);
  work.add(params, "segments", 2, 32, 1).onChange(rebuild);
  const measured = gui.addFolder("Measured");
  measured.add(readout, "stones").disable().listen();
  measured.add(readout, "triangles").disable().listen();
  measured.add(readout, "workbench").disable().listen();

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    bench.dispose();
    grid.dispose();
    handle.scene.clear();
    handle.dispose();
  };
};

export default mount;
