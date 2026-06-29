import { Group, InstancedMesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { centerObject, deriveSubSeed, rowOfBooksByCount } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Random",
  description:
    "createRandom(), mulberry32, and deriveSubSeed() — three book rows from one master seed, " +
    "or unique layouts when unseeded. Reload with the same seed to reproduce.",
};

/** Stable domain salts — one per subsystem stream (see deriveSubSeed). */
const SALT_ROW_A = 0x101;
const SALT_ROW_B = 0x202;
const SALT_ROW_C = 0x303;

const ROW_LABELS = ["Row A (0x101)", "Row B (0x202)", "Row C (0x303)"] as const;
const ROW_SALTS = [SALT_ROW_A, SALT_ROW_B, SALT_ROW_C] as const;
const ROW_COLORS = [0x8b0000, 0x1a4d6e, 0x3d5c2e] as const;
/** Vertical gap between shelves — book height is ~1.5 × scaleY (max ~1.43). */
const SHELF_SPACING = 1.65;

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 3.5, 9] });

  const params = {
    useSeed: true,
    masterSeed: 1337,
    count: 14,
  };

  const shelf = new Group();
  scene.add(shelf);

  let meshes: InstancedMesh[] = [];

  const rebuild = () => {
    for (const mesh of meshes) {
      shelf.remove(mesh);
      mesh.geometry.dispose();
    }
    meshes = [];

    ROW_SALTS.forEach((salt, i) => {
      const coverMaterial = new MeshStandardMaterial({
        color: ROW_COLORS[i],
        metalness: 0.1,
        roughness: 0.7,
        flatShading: true,
      });
      const pagesMaterial = new MeshStandardMaterial({ color: 0xffffff, flatShading: true });

      const seed = params.useSeed ? deriveSubSeed(params.masterSeed, salt) : undefined;
      const row = rowOfBooksByCount({
        coverMaterial,
        pagesMaterial,
        count: params.count,
        seed,
      });
      row.rotation.y = Math.PI / 2;
      row.position.set(0, i * SHELF_SPACING, 0);
      shelf.add(row);
      meshes.push(row);
    });

    centerObject(shelf);
  };

  rebuild();

  const gui = new GUI();
  gui.title("Random");
  gui.add(params, "useSeed").name("Use Master Seed").onChange(rebuild);
  gui.add(params, "masterSeed", 0, 99999, 1).name("Master Seed").onChange(rebuild);
  gui.add(params, "count", 4, 28, 1).name("Books / Row").onChange(rebuild);

  const saltsFolder = gui.addFolder("Sub-seed Salts");
  ROW_LABELS.forEach((label, i) => {
    saltsFolder.add({ salt: `0x${ROW_SALTS[i]!.toString(16)}` }, "salt").name(label).disable();
  });
  saltsFolder.open();

  return () => {
    gui.destroy();
    for (const mesh of meshes) {
      shelf.remove(mesh);
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((m) => m.dispose());
    }
    meshes = [];
    dispose();
  };
}