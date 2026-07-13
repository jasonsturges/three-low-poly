import { InstancedMesh, MathUtils, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { centerObject, stackOfBooks } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Stack of Books",
  description: "Floor stack by count — flat covers with in-plane spin jitter and optional seed.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [2.5, 4, 5] });

  const coverMaterial = new MeshStandardMaterial({
    color: 0x8b0000,
    metalness: 0.1,
    roughness: 0.7,
    flatShading: true,
  });
  const pagesMaterial = new MeshStandardMaterial({ color: 0xffffff, flatShading: true });

  const params = {
    useSeed: true,
    seed: 1337,
    count: 8,
    scaleXMin: 0.8,
    scaleXMax: 0.95,
    scaleYMin: 0.3,
    scaleYMax: 0.95,
    scaleZMin: 0.1,
    scaleZMax: 0.5,
    yawMaxDeg: 32,
    offsetMax: 0.06,
  };

  let mesh: InstancedMesh | undefined;

  const rebuild = () => {
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    mesh = stackOfBooks({
      coverMaterial,
      pagesMaterial,
      count: params.count,
      scaleXMin: params.scaleXMin,
      scaleXMax: params.scaleXMax,
      scaleYMin: params.scaleYMin,
      scaleYMax: params.scaleYMax,
      scaleZMin: params.scaleZMin,
      scaleZMax: params.scaleZMax,
      yawMax: MathUtils.degToRad(params.yawMaxDeg),
      offsetMax: params.offsetMax,
      seed: params.useSeed ? params.seed : undefined,
    });
    centerObject(mesh);
    scene.add(mesh);
  };

  const gui = new GUI();
  gui.title("Stack of Books");

  const seedFolder = gui.addFolder("Seed");
  seedFolder.add(params, "useSeed").name("Use Seed").onChange(rebuild);
  seedFolder.add(params, "seed", 0, 99999, 1).name("Seed").onChange(rebuild);
  seedFolder.open();

  const fitFolder = gui.addFolder("Fit");
  fitFolder.add(params, "count", 1, 24, 1).name("Count").onChange(rebuild);
  fitFolder.open();

  const rotationFolder = gui.addFolder("Placement");
  rotationFolder.add(params, "yawMaxDeg", 0, 90, 1).name("Spin Max (°)").onChange(rebuild);
  rotationFolder.add(params, "offsetMax", 0, 0.3, 0.01).name("Drift").onChange(rebuild);
  rotationFolder.open();

  const scaleFolder = gui.addFolder("Scale Ranges");
  scaleFolder.add(params, "scaleYMin", 0.01, 1, 0.01).name("Y Min").onChange(rebuild);
  scaleFolder.add(params, "scaleYMax", 0.01, 1, 0.01).name("Y Max").onChange(rebuild);
  scaleFolder.add(params, "scaleXMin", 0.01, 1, 0.01).name("X Min").onChange(rebuild);
  scaleFolder.add(params, "scaleXMax", 0.01, 1, 0.01).name("X Max").onChange(rebuild);
  scaleFolder.add(params, "scaleZMin", 0.01, 1, 0.01).name("Z Min").onChange(rebuild);
  scaleFolder.add(params, "scaleZMax", 0.01, 1, 0.01).name("Z Max").onChange(rebuild);
  scaleFolder.open();

  rebuild();

  return () => {
    gui.destroy();
    mesh?.geometry.dispose();
    coverMaterial.dispose();
    pagesMaterial.dispose();
    dispose();
  };
}