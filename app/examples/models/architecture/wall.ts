import GUI from "lil-gui";
import { ExtrudeGeometry, Mesh, MeshStandardMaterial } from "three";
import { ArchStyle, createDoubleDoor, DoubleDoor, GroundGrid, WallShape } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Wall",
  description:
    "A doorway carved out of the wall's OUTLINE and windows punched through it as HOLES — the two " +
    "operations a wall needs, and why they are not the same one.",
};

const ARCHES: ArchStyle[] = [
  "square",
  "segmental",
  "semicircle",
  "elliptical",
  "horseshoe",
  "pointed",
  "ogee",
];

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x2a3138,
    cameraPosition: [3.5, 2.6, 7.5],
  });

  controls.target.set(0, 1.6, 0);
  controls.update();

  const floor = new GroundGrid({ size: 12 });
  scene.add(floor);

  const params = {
    wallWidth: 6,
    wallHeight: 3.6,
    thickness: 0.3,
    curveSegments: 20,

    doorWidth: 1.3,
    doorHeight: 1.5,
    doorArch: "semicircle" as ArchStyle,

    windows: true,
    windowWidth: 0.8,
    windowHeight: 1,
    windowSill: 1.5,
    windowSpread: 2,
    windowArch: "ogee" as ArchStyle,

    open: 0.7,
  };

  const stone = new MeshStandardMaterial({ color: 0x9d9689, roughness: 0.95, flatShading: true });

  let wall: Mesh;
  let doors: DoubleDoor;

  const build = () => {
    const shape = new WallShape({
      width: params.wallWidth,
      height: params.wallHeight,
      // Reaches the floor, so it is a NOTCH in the outline. No threshold face, and the reveals come free.
      doorway: {
        width: params.doorWidth,
        height: params.doorHeight,
        arch: params.doorArch,
      },
      // Floats clear of every edge, so these are genuine HOLES — and they get a real sill face, which a
      // doorway must never have.
      windows: params.windows
        ? [-params.windowSpread, params.windowSpread].map((x) => ({
            width: params.windowWidth,
            height: params.windowHeight,
            arch: params.windowArch,
            x,
            y: params.windowSill,
          }))
        : [],
    });

    wall = new Mesh(
      new ExtrudeGeometry(shape, {
        depth: params.thickness,
        bevelEnabled: false,
        curveSegments: params.curveSegments,
      }),
      stone,
    );
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    // The door draws the SAME arc as the doorway, so it cannot disagree with the opening it hangs in.
    // Trimmed a hair under it on every axis, for clearance against the jambs.
    doors = createDoubleDoor({
      width: params.doorWidth - 0.04,
      height: params.doorHeight - 0.02,
      arch: params.doorArch,
      thickness: 0.1,
      hingeLength: 0.42,
      hingeWidth: 0.15,
      studRows: 4,
      studCols: 2,
      studRadius: 0.03,
    });
    // z is the wall's outer face: the straps are bolted to the OUTSIDE, so the pin lives there.
    doors.position.set(0, 0, params.thickness);
    scene.add(doors);

    swing();
  };

  // Outward, toward the hinges. The leaves mirror, so the sign flips between them.
  const swing = () => {
    doors.left.rotation.y = -params.open;
    doors.right.rotation.y = params.open;
  };

  const teardown = () => {
    scene.remove(wall);
    wall.geometry.dispose();
    scene.remove(doors);
    for (const leaf of [doors.left, doors.right]) {
      leaf.geometry.dispose();
      leaf.material.forEach((m) => m.dispose());
    }
  };

  const rebuild = () => {
    teardown();
    build();
  };

  build();

  const gui = new GUI();
  gui.title("Wall");
  gui.add(params, "open", -2.2, 2.2, 0.01).name("Open (− in · out +)").onChange(swing);

  const doorway = gui.addFolder("Doorway — a notch in the outline");
  // Change this and the DOOR changes with it. One arc, two consumers.
  doorway.add(params, "doorArch", ARCHES).name("Arch").onChange(rebuild);
  doorway.add(params, "doorWidth", 0.6, 2.4, 0.05).name("Width").onChange(rebuild);
  doorway.add(params, "doorHeight", 0.6, 2.6, 0.05).name("Body Height").onChange(rebuild);
  doorway.open();

  const windows = gui.addFolder("Windows — holes");
  windows.add(params, "windows").name("Cut Windows").onChange(rebuild);
  windows.add(params, "windowArch", ARCHES).name("Arch").onChange(rebuild);
  windows.add(params, "windowWidth", 0.3, 1.6, 0.05).name("Width").onChange(rebuild);
  windows.add(params, "windowHeight", 0.2, 1.6, 0.05).name("Body Height").onChange(rebuild);
  windows.add(params, "windowSill", 0.4, 2.4, 0.05).name("Sill Height").onChange(rebuild);
  windows.add(params, "windowSpread", 0.8, 2.6, 0.05).name("Spread").onChange(rebuild);
  windows.open();

  const slab = gui.addFolder("Wall");
  slab.add(params, "wallWidth", 3, 10, 0.1).name("Width").onChange(rebuild);
  slab.add(params, "wallHeight", 2, 6, 0.1).name("Height").onChange(rebuild);
  slab.add(params, "thickness", 0.1, 0.8, 0.05).name("Thickness").onChange(rebuild);
  slab.add(params, "curveSegments", 2, 32, 1).name("Curve Segments").onChange(rebuild);

  return () => {
    gui.destroy();
    teardown();
    stone.dispose();
    floor.dispose();
    dispose();
  };
}
