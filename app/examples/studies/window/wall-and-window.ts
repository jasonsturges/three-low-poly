import GUI from "lil-gui";
import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import {
  type ArchStyle,
  archRise,
  DiamondLatticeWindow,
  GregorianLatticeWindow,
  GroundGrid,
  type WallOpeningOptions,
  WallShape,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Wall And Window",
  description:
    "STUDY — the smallest complete example: a wall, a hole, and a window in it. The point is the FIRST " +
    "line. One `WallOpeningOptions` object punches the wall and builds the window, so the hole and the " +
    "thing in it cannot disagree — no matching numbers in two places, no separate arched code path, and " +
    "changing the arch changes both at once. `arch: \"square\"` is in the list because a flat head is an " +
    "arch-shaped hole with no curve in it. Read the `buildEverything` function; it is eight lines, and " +
    "everything else in this file is knobs.",
};

/** How much wall has to remain above the opening's head for it to still be a hole. */
const MARGIN = 0.25;

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x8792a0,
    cameraPosition: [2.2, 2.1, 4.2],
  });

  controls.target.set(0, 1.5, 0);
  controls.update();

  const floor = new GroundGrid({ size: 10, planeColor: 0x3f4954, gridColor: 0x4c5866 });
  scene.add(floor);

  const stone = new MeshStandardMaterial({ color: 0x9a958c, roughness: 0.95, flatShading: true });
  const stage = new Group();
  scene.add(stage);

  const params = {
    arch: "semicircle" as ArchStyle,
    lattice: "diamond" as "diamond" | "gregorian",
    openingWidth: 1.2,
    openingHeight: 1.4,
    sill: 1,
    wallWidth: 5,
    wallHeight: 4,
    wallThickness: 0.25,
    showWall: true,
  };

  let disposeLast: (() => void) | null = null;

  //------------------------------------------------------------------------------------------------
  //  THE WHOLE THING. Everything below this function is a knob.
  //------------------------------------------------------------------------------------------------
  function buildEverything() {
    // ONE description. It punches the wall, and it builds the window. Nothing is written twice.
    const opening: WallOpeningOptions = {
      width: params.openingWidth,
      height: params.openingHeight,
      arch: params.arch,
      x: 0,
      y: params.sill,
    };

    // A window is punched as a HOLE, which means it has to float CLEAR of every edge — one that reaches
    // the top is not a window at all, it is a notch, and `WallShape` would have to carve the outline
    // instead. So the wall is never allowed to be shorter than the opening needs. `archRise` reports what
    // the head will actually add, which is not `width / 2` for every style.
    // `y` is the springing line and `archRise` does not read it, but the type asks for it.
    const rise = archRise({ style: params.arch, halfSpan: params.openingWidth / 2, y: 0 });
    const headroom = params.sill + params.openingHeight + rise;
    params.wallHeight = Math.max(params.wallHeight, headroom + MARGIN);

    // 1. The wall, with that opening punched through it as a HOLE.
    const wall = new Mesh(
      new ExtrudeGeometry(
        new WallShape({ width: params.wallWidth, height: params.wallHeight, windows: [opening] }),
        { depth: params.wallThickness, bevelEnabled: false },
      ),
      stone,
    );

    // 2. The window, from the SAME object. It normalises the opening's `x` and `y` away and anchors
    //    itself sill-at-zero, so it is placed at exactly the coordinates the hole was punched at.
    const window =
      params.lattice === "diamond"
        ? new DiamondLatticeWindow({ opening })
        : new GregorianLatticeWindow({ opening });
    window.position.set(opening.x!, opening.y!, params.wallThickness / 2);

    return { wall, window };
  }
  //------------------------------------------------------------------------------------------------

  const rebuild = () => {
    disposeLast?.();
    stage.clear();

    const { wall, window } = buildEverything();
    wall.visible = params.showWall;
    wall.castShadow = true;
    wall.receiveShadow = true;
    stage.add(wall, window);

    disposeLast = () => {
      wall.geometry.dispose();
      window.dispose();
    };
  };
  rebuild();

  const gui = new GUI();
  gui.title("Wall And Window");

  const opening = gui.addFolder("Opening");
  // Changing this changes the HOLE and the WINDOW together, because they read the same object.
  opening
    .add(params, "arch", [
      "square",
      "segmental",
      "semicircle",
      "horseshoe",
      "elliptical",
      "pointed",
      "ogee",
    ])
    .name("Arch")
    .onChange(rebuild);
  opening.add(params, "openingWidth", 0.6, 2.4, 0.02).name("Width").onChange(rebuild);
  opening.add(params, "openingHeight", 0.4, 2.2, 0.02).name("Springing").onChange(rebuild);
  opening.add(params, "sill", 0.2, 1.8, 0.02).name("Sill Height").onChange(rebuild);
  opening.open();

  const fill = gui.addFolder("Window");
  // Both factories take the same `opening`, so they are interchangeable at the call site.
  fill
    .add(params, "lattice", { Diamond: "diamond", Gregorian: "gregorian" })
    .name("Lattice")
    .onChange(rebuild);
  fill.open();

  const wall = gui.addFolder("Wall");
  wall.add(params, "wallWidth", 2, 10, 0.1).name("Width").onChange(rebuild);
  // `.listen()` because the build pushes this value UP when the opening outgrows it — the slider moving
  // on its own is the explanation, and a silently overridden knob would not be.
  wall.add(params, "wallHeight", 1.5, 7, 0.1).name("Height").onChange(rebuild).listen();
  wall.add(params, "wallThickness", 0.05, 0.8, 0.01).name("Thickness").onChange(rebuild);
  // Hide it to check the window sits where the hole is, rather than merely looking like it does.
  wall.add(params, "showWall").name("Show Wall").onChange(rebuild);
  wall.open();

  return () => {
    gui.destroy();
    disposeLast?.();
    stone.dispose();
    floor.dispose();
    dispose();
  };
}
