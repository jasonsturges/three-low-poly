import GUI from "lil-gui";
import { Group, InstancedMesh, Material } from "three";
import { GroundGrid, rowOfHeadstones } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Headstone Row" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, {
    background: 0x2b3038,
    cameraPosition: [0, 3, 9],
  });

  const params = {
    count: 10,
    spacing: 1,
    seed: 1337,
    leanMax: 0.12,
    twistMax: 0.4,
    sinkMax: 0.08,
    driftMax: 0.05,
    scaleMin: 0.85,
    scaleMax: 1.2,
    weathering: 0.09,
  };

  let row = new Group();
  scene.add(row);

  let floor = new GroundGrid();
  scene.add(floor);

  const disposeRow = () => {
    for (const mesh of row.children) {
      const instanced = mesh as InstancedMesh;
      instanced.geometry.dispose();
    }
    const shared = (row.children[0] as InstancedMesh | undefined)?.material as Material | undefined;
    shared?.dispose();
  };

  const rebuild = () => {
    disposeRow();
    scene.remove(row);
    floor.dispose();
    scene.remove(floor);

    row = rowOfHeadstones(params);
    row.traverse((child) => {
      if (child instanceof InstancedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const length = (params.count - 1) * params.spacing;
    row.position.x = -length / 2;
    scene.add(row);

    const size = Math.max(8, Math.ceil(length) + 4);
    floor = new GroundGrid({ size });
    scene.add(floor);
  };

  rebuild();

  const gui = new GUI();
  gui.add(params, "count", 1, 30, 1).name("Plots").onChange(rebuild);
  gui.add(params, "spacing", 0.4, 3, 0.05).name("Plot Spacing").onChange(rebuild);
  gui.add(params, "seed", 1, 9999, 1).name("Seed").onChange(rebuild);

  const age = gui.addFolder("Settling");
  age.add(params, "leanMax", 0, 0.4, 0.005).name("Lean").onChange(rebuild);
  age.add(params, "twistMax", 0, 1.2, 0.01).name("Twist").onChange(rebuild);
  age.add(params, "sinkMax", 0, 0.4, 0.005).name("Sink").onChange(rebuild);
  age.add(params, "driftMax", 0, 0.3, 0.005).name("Drift").onChange(rebuild);
  age.add(params, "weathering", 0, 0.3, 0.005).name("Weathering").onChange(rebuild);

  const size = gui.addFolder("Size");
  size.add(params, "scaleMin", 0.5, 1.5, 0.01).name("Scale Min").onChange(rebuild);
  size.add(params, "scaleMax", 0.5, 1.8, 0.01).name("Scale Max").onChange(rebuild);

  return () => {
    gui.destroy();
    disposeRow();
    floor.dispose();
    dispose();
  };
}
