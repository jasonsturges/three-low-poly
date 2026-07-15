import GUI from "lil-gui";
import { ExtrudeGeometry, Mesh, MeshStandardMaterial } from "three";
import {
  ArchStyle,
  createWindow,
  GroundGrid,
  wallOpeningTop,
  WallShape,
  WindowAssembly,
  type WallOpeningOptions,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Window",
  description:
    "Glass, frame and sill cut from the SAME outline the wall was punched with — so the window fits its " +
    "hole by construction, at any arch.",
};

const ARCHES: ArchStyle[] = [
  "square",
  "segmental",
  "semicircle",
  "horseshoe",
  "elliptical",
  "pointed",
  "ogee",
];

/** Masonry the wall must keep above the opening's crown, however tall the arch gets. */
const HEADROOM = 0.5;

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x2a3138,
    cameraPosition: [1.6, 2, 3.4],
  });

  controls.target.set(0, 1.8, 0);
  controls.update();

  const floor = new GroundGrid({ size: 10 });
  scene.add(floor);

  const params = {
    arch: "ogee" as ArchStyle,
    width: 0.9,
    height: 1.1,
    archHeight: 0.55,
    sillHeight: 1.2,

    frame: true,
    inset: 0.04,
    outset: 0.06,
    depth: 0.06,

    sill: true,
    jut: 0.09,
    horn: 0.05,

    glass: true,

    wallWidth: 3.4,
    wallHeight: 4,
    thickness: 0.3,
  };

  const stone = new MeshStandardMaterial({ color: 0x9d9689, roughness: 0.95, flatShading: true });

  let wall: Mesh;
  let window: WindowAssembly;

  const build = () => {
    // ONE description. The wall punches its hole from it; the window is cut from it. They cannot disagree,
    // because there is nothing to keep in sync — it is the same object.
    const opening: WallOpeningOptions = {
      width: params.width,
      height: params.height,
      archHeight: params.archHeight,
      arch: params.arch,
      x: 0,
      y: params.sillHeight,
    };

    // A window that pokes out of the top of its wall is not a window, it is a doorway with extra steps.
    // `wallOpeningTop` reports the crown, so the wall can simply refuse to be shorter than the hole it
    // has to carry — drag the arch rise up and the wall grows to keep its head above it.
    const crown = wallOpeningTop(opening, params.wallWidth);
    const height = Math.max(params.wallHeight, crown + HEADROOM);

    wall = new Mesh(
      new ExtrudeGeometry(new WallShape({ width: params.wallWidth, height, windows: [opening] }), {
        depth: params.thickness,
        bevelEnabled: false,
        curveSegments: 32,
      }),
      stone,
    );
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    window = createWindow({
      opening,
      frame: params.frame,
      glass: params.glass,
      inset: params.inset,
      outset: params.outset,
      depth: params.depth,
      sill: params.sill ? { jut: params.jut, horn: params.horn } : false,
    });
    // Anchored at its sill and centered on X, so hanging it is one line: the opening's own x and y, and
    // the face of the wall it sits on.
    window.position.set(opening.x!, opening.y!, params.thickness);
    scene.add(window);
  };

  const teardown = () => {
    scene.remove(wall);
    wall.geometry.dispose();

    scene.remove(window);
    for (const part of [window.frame, window.glass, window.sill]) {
      if (!part) continue;
      part.geometry.dispose();
      (part.material as MeshStandardMaterial).dispose();
    }
  };

  const rebuild = () => {
    teardown();
    build();
  };

  build();

  const gui = new GUI();
  gui.title("Window");

  const opening = gui.addFolder("Opening");
  // Change this and the hole, the glass and the frame all become the new arch together.
  opening.add(params, "arch", ARCHES).name("Arch").onChange(rebuild);
  opening.add(params, "width", 0.4, 2, 0.05).name("Width").onChange(rebuild);
  opening.add(params, "height", 0.3, 2, 0.05).name("Body Height").onChange(rebuild);
  opening.add(params, "archHeight", 0.1, 1.2, 0.05).name("Arch Rise").onChange(rebuild);
  opening.add(params, "sillHeight", 0.4, 2.2, 0.05).name("Sill Height").onChange(rebuild);
  opening.open();

  const frame = gui.addFolder("Frame");
  frame.add(params, "frame").name("Frame").onChange(rebuild);
  // How far the frame bites INTO the aperture — the line of wood you see around the glass.
  frame.add(params, "inset", 0, 0.15, 0.005).name("Inset (bead)").onChange(rebuild);
  // How far it spills OUT onto the wall. 0 is a flush glazing bead; more makes it a picture-frame casing.
  frame.add(params, "outset", 0, 0.2, 0.005).name("Outset (casing)").onChange(rebuild);
  frame.add(params, "depth", 0.01, 0.2, 0.005).name("Depth").onChange(rebuild);
  frame.open();

  const sill = gui.addFolder("Sill");
  sill.add(params, "sill").name("Sill").onChange(rebuild);
  // The overhang is most of why a window reads as BUILT IN rather than cut out.
  sill.add(params, "jut", 0.02, 0.3, 0.01).name("Jut").onChange(rebuild);
  sill.add(params, "horn", 0, 0.2, 0.01).name("Horns").onChange(rebuild);
  sill.open();

  const glass = gui.addFolder("Glass");
  // Flat and DoubleSide — orbit behind the wall and it is still there.
  glass.add(params, "glass").name("Glass").onChange(rebuild);

  const wallFolder = gui.addFolder("Wall");
  wallFolder.add(params, "wallWidth", 1.5, 6, 0.1).name("Width").onChange(rebuild);
  // A floor, not a fixed value: the wall grows past this if the arch needs the headroom.
  wallFolder.add(params, "wallHeight", 1.5, 8, 0.1).name("Min Height").onChange(rebuild);
  wallFolder.add(params, "thickness", 0.1, 0.6, 0.05).name("Thickness").onChange(rebuild);

  return () => {
    gui.destroy();
    teardown();
    stone.dispose();
    floor.dispose();
    dispose();
  };
}
