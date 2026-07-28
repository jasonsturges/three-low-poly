import GUI from "lil-gui";
import { createDoubleDoor, DoubleDoor, GroundGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Double Door",
  description:
    "Two leaves under one shared arch, each hung on its own jamb. Every leaf's origin is its hinge, " +
    "so opening a door is a single rotation.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x9aa7b2,
    cameraPosition: [2.6, 2, 4.4],
  });

  controls.target.set(0, 1.2, 0);
  controls.update();

  const floor = new GroundGrid({ size: 10, planeColor: 0x3f4954, gridColor: 0x4c5866 });
  scene.add(floor);

  const params = {
    width: 2.6,
    height: 1.9,
    archHeight: 0.9,
    thickness: 0.12,
    curveSegments: 16,
    left: 0,
    right: 0,
    hinges: 3,
    hingeLength: 0.85,
    hingeWidth: 0.22,
    hingeSweep: 0.28,
    hingeTerminal: "spade" as "spade" | "club" | "none",
    studRows: 4,
    studCols: 2,
    studRadius: 0.035,
  };

  const disposeDoors = (doors: DoubleDoor) => {
    for (const leaf of [doors.left, doors.right]) {
      leaf.geometry.dispose();
      leaf.material.forEach((material) => material.dispose());
    }
  };

  let doors = createDoubleDoor(params);

  // Each leaf is driven on its own, because each leaf IS its own door — that is the whole API. Both
  // sliders read as "how far open," and the mirror lives here, in the sign: a left leaf swings outward
  // on a negative turn and a right leaf on a positive one.
  const swing = () => {
    doors.left.rotation.y = -params.left;
    doors.right.rotation.y = params.right;
  };

  scene.add(doors);
  swing();

  const rebuild = () => {
    scene.remove(doors);
    disposeDoors(doors);
    doors = createDoubleDoor(params);
    scene.add(doors);
    swing();
  };

  const gui = new GUI();
  gui.title("Double Door");

  // One slider per leaf — no `open`, because the Group does not own one. Closed is the MIDDLE of each:
  // right swings that leaf out toward its hinges, left swings it in. Move them independently and the
  // pair stands ajar, which is the point of not fusing them into a single control.
  const swingFolder = gui.addFolder("Swing");
  swingFolder.add(params, "left", -2.2, 2.2, 0.01).name("Left Leaf (− in · out +)").onChange(swing);
  swingFolder.add(params, "right", -2.2, 2.2, 0.01).name("Right Leaf (− in · out +)").onChange(swing);
  swingFolder.open();

  const slab = gui.addFolder("Opening");
  // The whole doorway, jamb to jamb — each leaf takes half of it, and half of the one shared arch.
  slab.add(params, "width", 1.2, 4, 0.05).name("Span").onChange(rebuild);
  slab.add(params, "height", 0.8, 3, 0.05).name("Body Height").onChange(rebuild);
  slab.add(params, "archHeight", 0.1, 1.6, 0.05).name("Arch Rise").onChange(rebuild);
  slab.add(params, "thickness", 0.03, 0.4, 0.01).name("Thickness").onChange(rebuild);
  slab.add(params, "curveSegments", 2, 32, 1).name("Curve Segments").onChange(rebuild);
  slab.open();

  const hinge = gui.addFolder("Strap Hinges");
  hinge.add(params, "hinges", 0, 5, 1).name("Count").onChange(rebuild);
  hinge.add(params, "hingeLength", 0.2, 1.6, 0.05).name("Length").onChange(rebuild);
  hinge.add(params, "hingeWidth", 0.06, 0.5, 0.01).name("Width").onChange(rebuild);
  hinge.add(params, "hingeSweep", 0.05, 0.5, 0.01).name("Inward Sweep").onChange(rebuild);
  hinge.add(params, "hingeTerminal", ["spade", "club", "none"]).name("Terminal").onChange(rebuild);

  const studs = gui.addFolder("Studs");
  studs.add(params, "studRows", 0, 8, 1).name("Rows").onChange(rebuild);
  studs.add(params, "studCols", 0, 6, 1).name("Columns").onChange(rebuild);
  studs.add(params, "studRadius", 0.01, 0.08, 0.005).name("Radius").onChange(rebuild);

  return () => {
    gui.destroy();
    disposeDoors(doors);
    floor.dispose();
    dispose();
  };
}
