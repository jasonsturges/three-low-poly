import GUI from "lil-gui";
import { type Box3, type BufferGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, type Sprite, Vector2 } from "three";
import { GroundGrid, HEADSTONE_CATALOG, type HeadstoneEntry, type HeadstoneFamily } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { createTextSprite } from "../../../framework/createTextSprite";
import type { ExampleMeta, ExampleMount } from "../../../framework/example";
import { frameObject } from "../../../framework/frameObject";

export const meta: ExampleMeta = {
  title: "Headstone Gallery",
  description:
    "The whole HEADSTONE_CATALOG, one stone per entry. Rows of TABLETS — the stonecutter's chart of tops, every " +
    "one a (top × shoulder) pairing of one outline builder — then the CROSSES and OBELISKS, then the MONUMENTS " +
    "assembled from the mason's kit. Click a stone to select it: it turns amber, and the Selected Stone folder " +
    "offers ITS builder's real options, read from the catalogue entry. Isolate Selected shows it alone.",
};

const FAMILIES: HeadstoneFamily[] = ["tablet", "cross", "obelisk", "monument"];

/** Options whose value is a fraction of something, so their slider runs 0–1 whatever the default. */
const FRACTIONS = new Set(["peak", "crossing", "gothicSpring", "ringSize"]);
/** Options that count things, so their slider steps by one. */
const COUNTS = new Set(["segments", "steps", "ringSegments"]);

type Options = Record<string, unknown>;

const mount: ExampleMount = (container) => {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [2, 3.2, 9] });
  const { scene, camera, renderer } = handle;
  let gridSize = 16;
  let grid = new GroundGrid({ size: gridSize, divisions: gridSize * 2 });
  scene.add(grid);

  const stone = new MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.92, flatShading: true });
  const amber = new MeshStandardMaterial({ color: 0xc9a36a, roughness: 0.92, flatShading: true });
  const stage = new Group();
  scene.add(stage);

  const params = {
    showLabels: true,
    family: "all" as "all" | HeadstoneFamily,
    selected: "tablet/ovalScotia" as string,
    isolate: false,
    /** `front` looks straight at the faces — for reading silhouettes against the chart. */
    view: "perspective" as "perspective" | "front",
  };
  const readout = { stones: "", triangles: "", selected: "" };

  /** Lab-only working copies of options, by stone — never written back to the catalogue. Reset forgets one. */
  const edits = new Map<string, Options>();
  /** The stones whose options have actually been moved, so their labels can say so. */
  const changed = new Set<string>();
  const entryNamed = (name: string) => HEADSTONE_CATALOG.find((e) => e.name === name)!;
  const selectedEntry = () => entryNamed(params.selected);
  const editsFor = (entry: HeadstoneEntry): Options => {
    let edit = edits.get(entry.name);
    if (!edit) edits.set(entry.name, (edit = structuredClone(entry.options) as Options));
    return edit;
  };
  const build = (entry: HeadstoneEntry) => entry.build(edits.get(entry.name));

  const triangles = (g: BufferGeometry) => (g.index ? g.index.count : g.getAttribute("position").count) / 3;
  const describe = (g: BufferGeometry) => {
    g.computeBoundingBox();
    return `${triangles(g)} tris · ${g.boundingBox!.max.y.toFixed(2)} m tall`;
  };

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

  //------------------------------
  //  Layout
  //------------------------------

  /**
   * Lay the stones out in rows no wider than {@link ROW_WIDTH}, each spaced by its own measured width and
   * each row as deep as its deepest stone. A family always starts a new row, behind the last, with an aisle
   * between — tablets at the front, monuments at the back, so the tall do not hide the short. Returns the
   * occupied extent, so the grid can be fitted to it.
   */
  const ROW_WIDTH = 9.6;
  function layOut(families: HeadstoneEntry[][]): { width: number; depth: number } {
    const gap = 0.4;
    //  Between rows of one family, and the wider aisle where one family gives way to the next.
    const rowGap = 0.9;
    const aisle = 1.4;
    type Placed = { entry: HeadstoneEntry; g: BufferGeometry; box: Box3 };
    const rows: { items: Placed[]; width: number; depth: number }[] = [];
    const aisles: number[] = [];
    for (const entries of families) {
      if (entries.length === 0) continue;
      if (rows.length) aisles[rows.length] = aisle;
      let row: (typeof rows)[number] | undefined;
      for (const entry of entries) {
        const g = build(entry);
        g.computeBoundingBox();
        const box = g.boundingBox!;
        const w = box.max.x - box.min.x;
        if (!row || row.width + gap + w > ROW_WIDTH) {
          if (row) aisles[rows.length] = rowGap;
          rows.push((row = { items: [], width: -gap, depth: 0 }));
        }
        row.items.push({ entry, g, box });
        row.width += gap + w;
        row.depth = Math.max(row.depth, box.max.z - box.min.z);
      }
    }
    //  Each row's depth plus room for its labels in front, rows running back toward −Z.
    const labelRoom = params.showLabels ? 0.45 : 0.25;
    let z = 0;
    let width = 0;
    const placed: (Placed & { x: number; z: number })[] = [];
    rows.forEach((row, i) => {
      z -= aisles[i] ?? 0;
      const centre = z - labelRoom - row.depth / 2;
      z -= labelRoom + row.depth;
      let cursor = -row.width / 2;
      for (const item of row.items) {
        placed.push({ ...item, x: cursor - item.box.min.x, z: centre - (item.box.min.z + item.box.max.z) / 2 });
        cursor += item.box.max.x - item.box.min.x + gap;
      }
      width = Math.max(width, row.width);
    });
    //  Centre the whole layout on the origin, front to back.
    const shift = -z / 2;
    let total = 0;
    for (const { entry, g, box, x, z: rowZ } of placed) {
      const chosen = entry.name === params.selected;
      const mesh = new Mesh(g, chosen ? amber : stone);
      mesh.name = entry.name;
      mesh.position.set(x, 0, rowZ + shift);
      mesh.castShadow = mesh.receiveShadow = true;
      stage.add(mesh);
      //  An asterisk marks a stone that no longer matches its catalogue entry.
      const text = entry.label + (changed.has(entry.name) ? " *" : "");
      if (params.showLabels) stage.add(label(text, x, rowZ + shift + box.max.z + 0.22, chosen ? "#e0b878" : undefined));
      total += triangles(g);
    }
    readout.triangles = `${total}`;
    return { width, depth: -z };
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

  function rebuild(): void {
    clear();
    const shown = params.isolate
      ? [selectedEntry()]
      : HEADSTONE_CATALOG.filter((e) => params.family === "all" || e.family === params.family);
    const of = (families: HeadstoneFamily[]) => shown.filter((e) => families.includes(e.family));
    fitGrid(layOut([of(["tablet"]), of(["cross", "obelisk"]), of(["monument"])]));
    readout.stones = `${shown.length} of ${HEADSTONE_CATALOG.length}`;
    const mesh = stage.getObjectByName(params.selected) as Mesh | undefined;
    readout.selected = mesh ? describe(mesh.geometry) : "(not shown)";
  }

  /** Swap the selected stone's geometry in place — cheap enough to follow a slider while it drags. */
  function rebuildSelected(): void {
    const mesh = stage.getObjectByName(params.selected) as Mesh | undefined;
    if (!mesh) return;
    mesh.geometry.dispose();
    mesh.geometry = build(selectedEntry());
    readout.selected = describe(mesh.geometry);
  }

  //------------------------------
  //  View
  //------------------------------

  //  `?family=tablet`, `?select=cross/celtic&isolate`, `?view=front` — for captures.
  const query = new URLSearchParams(location.search);
  const family = query.get("family") as HeadstoneFamily | null;
  if (family && FAMILIES.includes(family)) params.family = family;
  const select = query.get("select");
  if (select && HEADSTONE_CATALOG.some((e) => e.name === select)) params.selected = select;
  if (query.has("isolate")) params.isolate = true;
  if (query.get("view") === "front") params.view = "front";

  const refocus = () => {
    rebuild();
    handle.controls.target.set(0, 0, 0);
    if (params.view === "front") camera.position.set(0, 4.5, 10);
    else camera.position.set(2, 5.5, 9);
    frameObject(handle, stage.children.length ? stage : grid, { fit: params.isolate ? 2 : 0.95 });
  };

  //------------------------------
  //  GUI
  //------------------------------

  const gui = new GUI({ title: "Headstone Gallery" });
  gui.add(params, "showLabels").onChange(rebuild);
  gui.add(params, "family", ["all", ...FAMILIES]).onChange(refocus);
  const selectControl = gui
    .add(
      params,
      "selected",
      HEADSTONE_CATALOG.map((e) => e.name),
    )
    .onChange(() => {
      if (params.isolate) refocus();
      else rebuild();
      inspect();
    });
  gui.add(params, "isolate").name("Isolate Selected").onChange(refocus);
  gui.add(params, "view", ["perspective", "front"]).onChange(refocus);
  //  Controls above, readouts below: the inspector's folder is made here, once, so it stays above Measured,
  //  and only its contents are rebuilt when the selection changes.
  const inspector = gui.addFolder("Selected Stone");
  const measured = gui.addFolder("Measured");
  measured.add(readout, "stones").disable().listen();
  measured.add(readout, "triangles").disable().listen();
  measured.add(readout, "selected").disable().listen();

  /**
   * The Selected Stone folder, generated from the entry's own options: a number is a slider ranged from its
   * catalogue value, a flag a checkbox, a named choice a dropdown, a nested group a subfolder. Labels are the
   * real option names, because they ARE the option names.
   */
  function inspect(): void {
    for (const folder of [...inspector.folders]) folder.destroy();
    for (const controller of [...inspector.controllers]) controller.destroy();
    const entry = selectedEntry();
    inspector.title(`Selected Stone — ${entry.label}`);
    const edit = editsFor(entry);
    const touched = () => {
      changed.add(entry.name);
      rebuild();
    };
    const addOptions = (folder: GUI, values: Options, defaults: Options) => {
      for (const [key, value] of Object.entries(values)) {
        const fallback = defaults[key];
        const choices = entry.choices[key];
        if (choices) {
          const named = Object.fromEntries(choices.map((c) => [c ?? (key === "rightShoulder" ? "(mirror)" : "(none)"), c]));
          folder.add(values, key, named).onChange(() => {
            rebuildSelected();
            touched();
          });
        } else if (typeof value === "number") {
          const base = typeof fallback === "number" ? Math.abs(fallback) : Math.abs(value);
          const count = COUNTS.has(key);
          const max = FRACTIONS.has(key) ? 1 : count ? Math.max(8, base * 3) : base > 0 ? base * 3 : 1;
          const step = count ? 1 : FRACTIONS.has(key) ? 0.01 : Math.max(0.001, Number((max / 300).toPrecision(1)));
          folder.add(values, key, 0, max, step).onChange(rebuildSelected).onFinishChange(touched);
        } else if (typeof value === "boolean") {
          folder.add(values, key).onChange(() => {
            rebuildSelected();
            touched();
          });
        } else if (value && typeof value === "object") {
          addOptions(folder.addFolder(key), value as Options, (fallback ?? {}) as Options);
        }
        //  A null with no choices (a "same as the left" override) has nothing to offer a slider.
      }
    };
    addOptions(inspector, edit, entry.options as Options);
    inspector
      .add(
        {
          reset: () => {
            edits.delete(entry.name);
            changed.delete(entry.name);
            rebuild();
            inspect();
          },
        },
        "reset",
      )
      .name("Reset to catalogue");
  }

  //------------------------------
  //  Click to select
  //------------------------------

  //  Pick only stones, so labels do not intercept the ray. Track the whole gesture: moving away and back
  //  still counts as a drag, and a second finger cancels tap selection.
  const canvas = renderer.domElement;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let tap: { id: number; x: number; y: number } | undefined;
  const cancelTap = () => {
    tap = undefined;
  };
  const pointerDown = (event: PointerEvent) => {
    tap = event.isPrimary && event.button === 0 ? { id: event.pointerId, x: event.clientX, y: event.clientY } : undefined;
  };
  const pointerMove = (event: PointerEvent) => {
    if (tap && event.pointerId === tap.id && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 6) cancelTap();
  };
  const pointerUp = (event: PointerEvent) => {
    const start = tap;
    cancelTap();
    if (!start || event.pointerId !== start.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    if (Math.abs(pointer.x) > 1 || Math.abs(pointer.y) > 1) return;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    const stones = stage.children.filter((child): child is Mesh => child instanceof Mesh);
    const hit = raycaster.intersectObjects(stones, false)[0];
    if (hit && hit.object.name !== params.selected) selectControl.setValue(hit.object.name);
  };
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", cancelTap);
  canvas.addEventListener("pointerleave", cancelTap);

  inspect();
  refocus();

  return () => {
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", cancelTap);
    canvas.removeEventListener("pointerleave", cancelTap);
    gui.destroy();
    clear();
    stone.dispose();
    amber.dispose();
    grid.dispose();
    handle.scene.clear();
    handle.dispose();
  };
};

export default mount;
