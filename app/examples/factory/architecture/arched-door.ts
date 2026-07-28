import GUI from "lil-gui";
import { BufferGeometry, Material, Mesh } from "three";
import { createArchedDoor, GroundGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Arched Door" };

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x9aa7b2,
    cameraPosition: [1.8, 1.8, 3.6],
  });

  controls.target.set(0, 1.1, 0);
  controls.update();

  const floor = new GroundGrid({ size: 8, planeColor: 0x3f4954, gridColor: 0x4c5866 });
  scene.add(floor);

  const params = {
    width: 1.3,
    height: 1.9,
    archHeight: 0.65,
    thickness: 0.12,
    curveSegments: 16,
    hinge: "left" as "left" | "right",
    open: 0,
    hinges: 3,
    hingeLength: 0.85,
    hingeWidth: 0.22,
    hingeSweep: 0.28,
    hingeTerminal: "spade" as "spade" | "club" | "none",
    studRows: 4,
    studCols: 3,
    studRadius: 0.035,
  };

  const disposeDoor = (mesh: Mesh<BufferGeometry, Material[]>) => {
    mesh.geometry.dispose();
    mesh.material.forEach((material) => material.dispose());
  };

  let door = createArchedDoor(params);

  // The door's origin is its hinge, so hanging it means putting that hinge on its jamb — which is all
  // it takes to stand a closed door squarely in a doorway centered on the origin.
  const hang = () => {
    door.position.x = (params.hinge === "left" ? -1 : 1) * (params.width / 2);
    swing();
  };

  // Doors open OUTWARD — toward the face their hinges are bolted to, which is the face you are looking
  // at. A left-hung door does that on a negative turn and a right-hung one on a positive: they mirror.
  const swing = () => {
    door.rotation.y = params.open * (params.hinge === "left" ? -1 : 1);
  };

  scene.add(door);
  hang();

  const rebuild = () => {
    scene.remove(door);
    disposeDoor(door);
    door = createArchedDoor(params);
    scene.add(door);
    hang();
  };

  const gui = new GUI();
  gui.title("Arched Door");

  // No centering here, and no pivot group: the geometry's own origin sits on the hinge, so opening the
  // door is one rotation and nothing else. Closed is the MIDDLE of this slider — right swings it out
  // toward the hinges, left swings it in, through where the wall would be.
  gui.add(params, "open", -2.2, 2.2, 0.01).name("Open (− in · out +)").onChange(swing);
  gui.add(params, "hinge", ["left", "right"]).name("Hinge Side").onChange(rebuild);

  const slab = gui.addFolder("Slab");
  slab.add(params, "width", 0.6, 2.5, 0.05).name("Width").onChange(rebuild);
  slab.add(params, "height", 0.8, 3, 0.05).name("Body Height").onChange(rebuild);
  slab.add(params, "archHeight", 0.1, 1.4, 0.05).name("Arch Rise").onChange(rebuild);
  slab.add(params, "thickness", 0.03, 0.4, 0.01).name("Thickness").onChange(rebuild);
  // The low-poly knob, on a filled arch. 3 is chiselled; 24 is cast.
  slab.add(params, "curveSegments", 2, 32, 1).name("Curve Segments").onChange(rebuild);

  const hinge = gui.addFolder("Strap Hinges");
  hinge.add(params, "hinges", 0, 5, 1).name("Count").onChange(rebuild);
  hinge.add(params, "hingeLength", 0.2, 1.6, 0.05).name("Length").onChange(rebuild);
  hinge.add(params, "hingeWidth", 0.06, 0.5, 0.01).name("Width").onChange(rebuild);
  // 0.5 is straight sides — a dull triangle. Lower and the edges bow IN, and it looks forged.
  hinge.add(params, "hingeSweep", 0.05, 0.5, 0.01).name("Inward Sweep").onChange(rebuild);
  hinge.add(params, "hingeTerminal", ["spade", "club", "none"]).name("Terminal").onChange(rebuild);
  hinge.open();

  const studs = gui.addFolder("Studs");
  studs.add(params, "studRows", 0, 8, 1).name("Rows").onChange(rebuild);
  studs.add(params, "studCols", 0, 6, 1).name("Columns").onChange(rebuild);
  studs.add(params, "studRadius", 0.01, 0.08, 0.005).name("Radius").onChange(rebuild);

  return () => {
    gui.destroy();
    disposeDoor(door);
    floor.dispose();
    dispose();
  };
}
