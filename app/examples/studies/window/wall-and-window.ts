import GUI from "lil-gui";
import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape } from "three";
import {
  archRise,
  type ArchStyle,
  type WallOpeningOptions,
  DiamondLatticeWindow,
  GregorianLatticeWindow,
  GroundGrid,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Wall And Window",
  description:
    "Build the window first, then push window.cutout into a plain Shape's holes and extrude the wall. " +
    "The cutout includes the opening's x and sill height; position the window at those same coordinates. " +
    "Switch arch styles and lattice patterns to see the opening and window stay aligned. " +
    "Keep the hole inside the wall: a doorway touching the floor needs a notch in the outer outline.",
};

/** How much wall has to remain above the opening's head for it to still be a hole. */
const MARGIN = 0.25;

const mount = (container: HTMLElement) => {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x8792a0,
    cameraPosition: [2.2, 2.1, 4.2],
  });

  controls.target.set(0, 1.5, 0);
  controls.update();

  const floor = new GroundGrid({ size: 10 });
  scene.add(floor);

  const stone = new MeshStandardMaterial({ color: 0x9a958c, roughness: 0.95, flatShading: true });
  const stage = new Group();
  scene.add(stage);

  const params = {
    arch: "semicircle" as ArchStyle,
    lattice: "diamond" as "diamond" | "gregorian",
    openingWidth: 1.2,
    openingHeight: 1.4,
    archHeight: 0.6,
    sill: 1,
    wallWidth: 5,
    wallHeight: 4,
    wallThickness: 0.25,
    showWall: true,
    riseOut: "",
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
      archHeight: params.archHeight,
      x: 0,
      y: params.sill,
    };

    // A window is punched as a HOLE, so it has to float CLEAR of every edge. One that reaches the top is
    // not a window at all — it is a notch, and a notch belongs in the OUTLINE, because `ExtrudeGeometry`
    // builds side walls along every contour including holes, and a hole touching the boundary lays a face
    // across the gap. So the wall is never allowed to be shorter than the opening needs.
    //
    // `archRise` reports what the head will actually add, which is not `width / 2` for every style.
    // `y` is the springing line and `archRise` does not read it, but the type asks for it.
    const rise = archRise({
      style: params.arch,
      halfSpan: params.openingWidth / 2,
      rise: params.archHeight,
      y: 0,
    });
    // What the style will ACTUALLY do with the height asked for. Several clamp: `square` ignores it
    // outright, `semicircle` is always its half-span, `segmental` cannot exceed one and `horseshoe` and
    // `pointed` cannot fall below one. Only `elliptical` and `ogee` take the number as given.
    params.riseOut =
      Math.abs(rise - params.archHeight) < 1e-6
        ? `${rise.toFixed(3)} — as asked`
        : `${rise.toFixed(3)} — ${params.arch} clamped ${params.archHeight.toFixed(3)}`;
    const headroom = params.sill + params.openingHeight + rise;
    params.wallHeight = Math.max(params.wallHeight, headroom + MARGIN);

    // 1. The window. Built FIRST, because it is the thing that knows what hole it needs.
    const window = params.lattice === "diamond" ? new DiamondLatticeWindow({ opening }) : new GregorianLatticeWindow({ opening });

    // 2. The wall. Four corners — there is no wall class, because a wall with a window in it does not
    //    need one. Wound counter-clockwise from the bottom-left.
    const half = params.wallWidth / 2;
    const wallShape = new Shape();
    wallShape.moveTo(-half, 0);
    wallShape.lineTo(half, 0);
    wallShape.lineTo(half, params.wallHeight);
    wallShape.lineTo(-half, params.wallHeight);
    wallShape.closePath();

    // 3. THE CUT — the whole point of the study. The wall is not told how to draw a window; it ASKS THE
    //    WINDOW FOR ITS CUTOUT and punches that. Already positioned at the opening's own x and sill, and
    //    already wound clockwise against the wall's counter-clockwise outline, so it drops in with no
    //    transform and no fixup.
    //
    //    Note you could not have guessed this curve by looking at the window: the frame stands PROUD of
    //    the hole and the jamb lines it from inside, so neither visible edge is the cut. The window
    //    traced it to build itself and hands back the one it used.
    //
    //    That is the entire relationship between a window and a wall. No wall entity is required, and
    //    none should be: a wall that knew what a window was would grow a doorway, then a windows list,
    //    then a way to say "this one is a notch" — which is how a shape becomes a super-component.
    wallShape.holes.push(window.cutout);

    const wall = new Mesh(new ExtrudeGeometry(wallShape, { depth: params.wallThickness, bevelEnabled: false }), stone);

    // 4. Hang it. The assembly anchors itself sill-at-zero and centered on x, so it lands at exactly
    //    the coordinates its own cutout was punched at.
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
    .add(params, "arch", ["square", "segmental", "semicircle", "horseshoe", "elliptical", "pointed", "ogee"])
    .name("Arch")
    .onChange(rebuild);
  opening.add(params, "openingWidth", 0.6, 2.4, 0.02).name("Width").onChange(rebuild);
  opening.add(params, "openingHeight", 0.4, 2.2, 0.02).name("Springing").onChange(rebuild);
  // How far the head rises above the springing. Each style treats it differently and some ignore it —
  // the Readout reports what was actually used, which is the only way to see the clamping happen.
  opening.add(params, "archHeight", 0.05, 2, 0.02).name("Rise").onChange(rebuild);
  opening.add(params, "sill", 0.2, 1.8, 0.02).name("Sill Height").onChange(rebuild);
  opening.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "riseOut").name("Rise").listen().disable();
  readout.open();

  const fill = gui.addFolder("Window");
  // Both factories take the same `opening`, so they are interchangeable at the call site.
  fill.add(params, "lattice", { Diamond: "diamond", Gregorian: "gregorian" }).name("Lattice").onChange(rebuild);
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
};

export default mount;
