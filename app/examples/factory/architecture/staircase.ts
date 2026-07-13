import GUI from "lil-gui";
import { Box3, DoubleSide, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { createStaircase } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";

export const meta = {
  title: "Staircase",
  description: "Flights turning at each landing — quarter turns wrap a stairwell, ±180 switches back.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createOrthographicScene(container);

  const params = {
    flights: 2,
    stepsPerFlight: 5,
    turn: 90,
    well: 0,
    width: 2,
    riserHeight: 0.3,
    treadDepth: 0.5,
    landingSize: 2,
    color: "#8b4513",
  };

  let stairs = createStaircase(params);
  scene.add(stairs);

  const frame = (mesh: Mesh) => {
    const center = new Box3().setFromObject(mesh).getCenter(new Vector3());
    controls.target.copy(center);
    controls.update();
  };

  const rebuild = () => {
    stairs.geometry.dispose();
    (stairs.material as MeshStandardMaterial).dispose();
    scene.remove(stairs);

    stairs = createStaircase({
      ...params,
      // A flight is an open shell — treads and risers, with no undersides or stringers. Backface
      // culling is therefore correct, and it makes the thing hard to read while you turn it over.
      // Double-siding is a gallery affordance, not something you'd ship a scene with.
      material: new MeshStandardMaterial({
        color: params.color,
        flatShading: true,
        roughness: 0.9,
        side: DoubleSide,
      }),
    });
    stairs.castShadow = true;
    stairs.receiveShadow = true;

    scene.add(stairs);
    frame(stairs);
  };

  rebuild();

  const gui = new GUI();
  // 1 flight is the bare geometry; 2 is the L-shape; 5 quarter-turns wrap back above the first.
  gui.add(params, "flights", 1, 20, 1).name("Flights").onChange(rebuild);
  gui.add(params, "stepsPerFlight", 1, 20, 1).name("Steps / Flight").onChange(rebuild);
  gui.add(params, "turn", [-180, -90, 0, 90, 180]).name("Turn at Landing (°)").onChange(rebuild);
  // Only a switchback has a well — the open shaft between its two parallel flights.
  gui.add(params, "well", 0, 3, 0.05).name("Well (±180 only)").onChange(rebuild);

  const shape = gui.addFolder("Step");
  shape.add(params, "width", 0.5, 5, 0.1).name("Width").onChange(rebuild);
  shape.add(params, "riserHeight", 0.1, 0.6, 0.01).name("Riser Height").onChange(rebuild);
  shape.add(params, "treadDepth", 0.2, 1.2, 0.01).name("Tread Depth").onChange(rebuild);
  shape.add(params, "landingSize", 0.5, 5, 0.1).name("Landing Size").onChange(rebuild);
  shape.addColor(params, "color").name("Color").onChange(rebuild);

  return () => {
    gui.destroy();
    stairs.geometry.dispose();
    (stairs.material as MeshStandardMaterial).dispose();
    dispose();
  };
}
