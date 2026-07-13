import GUI from "lil-gui";
import { BufferGeometry, Material, Mesh } from "three";
import { centerObject, createArchedDoor } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Arched Door" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x9aa7b2, cameraPosition: [0.5, 1.6, 3.2] });

  const params = {
    width: 1.3,
    height: 1.9,
    archHeight: 0.65,
    thickness: 0.12,
    curveSegments: 16,
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
  scene.add(door);
  centerObject(door);

  const rebuild = () => {
    scene.remove(door);
    disposeDoor(door);
    door = createArchedDoor(params);
    scene.add(door);
    centerObject(door);
  };

  const gui = new GUI();
  gui.title("Arched Door");

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
    dispose();
  };
}
