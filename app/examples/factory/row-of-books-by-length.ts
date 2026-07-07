import { InstancedMesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { centerObject, rowOfBooksByLength } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Row of Books (by Length)",
  description: "Greedy-pack books to a shelf length — seeded layout via createRandom().",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 3, 5] });

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
    length: 10,
    scaleXMin: 0.4,
    scaleXMax: 0.7,
    scaleYMin: 0.3,
    scaleYMax: 0.95,
    scaleZMin: 0.1,
    scaleZMax: 0.5,
  };

  let mesh: InstancedMesh | undefined;

  const rebuild = () => {
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    mesh = rowOfBooksByLength({
      coverMaterial,
      pagesMaterial,
      length: params.length,
      scaleXMin: params.scaleXMin,
      scaleXMax: params.scaleXMax,
      scaleYMin: params.scaleYMin,
      scaleYMax: params.scaleYMax,
      scaleZMin: params.scaleZMin,
      scaleZMax: params.scaleZMax,
      seed: params.useSeed ? params.seed : undefined,
    });
    mesh.rotation.y = Math.PI / 2;
    centerObject(mesh);
    scene.add(mesh);
  };

  const gui = new GUI();
  gui.title("Row of Books (by Length)");

  const seedFolder = gui.addFolder("Seed");
  seedFolder.add(params, "useSeed").name("Use Seed").onChange(rebuild);
  seedFolder.add(params, "seed", 0, 99999, 1).name("Seed").onChange(rebuild);
  seedFolder.open();

  const fitFolder = gui.addFolder("Fit");
  fitFolder.add(params, "length", 1, 20, 0.5).name("Length").onChange(rebuild);
  fitFolder.open();

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