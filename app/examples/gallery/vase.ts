import GUI from "lil-gui";
import { DoubleSide, Group, Mesh, MeshStandardMaterial } from "three";
import { createRandom, VaseGeometry } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";

export const meta = { title: "Vase" };

export default function (container: HTMLElement) {
  const handle = createScene(container);
  const { scene, dispose } = handle;

  const params = {
    seed: 1337,
    columns: 10,
    rows: 10,
  };

  // One matched palette across the whole wall, so only the SILHOUETTE varies. Shared by every vase, so a
  // hundred pots cost three materials. DoubleSide is a gallery choice — the open lathe has no interior, and
  // without it the backfaces read as see-through at this scale. The base VaseGeometry stays single-sided.
  const palette = [
    new MeshStandardMaterial({ color: 0x4f7488, roughness: 0.6, flatShading: true, side: DoubleSide }),
    new MeshStandardMaterial({ color: 0xd7d2c6, roughness: 0.55, flatShading: true, side: DoubleSide }),
    new MeshStandardMaterial({ color: 0xb06a3c, roughness: 0.6, flatShading: true, side: DoubleSide }),
  ];

  const pitch = 1.8;
  let grid = new Group();
  scene.add(grid);

  const clear = () => {
    grid.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
    scene.remove(grid);
    grid = new Group();
    scene.add(grid);
  };

  const build = () => {
    clear();
    // One seeded stream drawn row-major — the same seed rebuilds the same wall.
    const form = createRandom(params.seed);
    const { columns, rows } = params;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const radii = [
          form.float(0.28, 0.42), // foot
          form.float(0.5, 0.75), // lower belly
          form.float(0.35, 0.7), // waist
          form.float(0.3, 0.6), // shoulder
          form.float(0.32, 0.6), // lip
        ];
        // 0, 1, or 2 bands → 1, 2, or 3 material groups, matched from the palette.
        const bands = Array.from({ length: form.int(0, 2) }, () => form.float(0.15, 0.85)).sort((a, b) => a - b);

        const mesh = new Mesh(
          new VaseGeometry({ radii, height: 2.4, profileSegments: 24, radialSegments: form.int(8, 16), bands }),
          bands.length > 0 ? palette.slice(0, bands.length + 1) : palette[1],
        );
        mesh.castShadow = true;
        mesh.position.set((c - (columns - 1) / 2) * pitch, 0, (r - (rows - 1) / 2) * pitch);
        grid.add(mesh);
      }
    }
  };

  build();
  // Frame ONCE, here, and never again. frameObject recomputes the camera distance from the bounding
  // sphere, so calling it on any rebuild dollies the camera and throws away the viewer's zoom — the
  // recurring frameObject papercut. Seed, Reseed and grid resize all rebuild WITHOUT reframing, so zoom
  // and pan survive every control. A larger grid that overflows is a one-time manual zoom-out, not a reset.
  frameObject(handle, grid);

  const gui = new GUI();
  gui.title("Vase Gallery");
  const seedField = gui.add(params, "seed", 0, 9999, 1).name("Seed").onChange(build);
  gui.add(params, "columns", 1, 16, 1).name("Columns").onChange(build);
  gui.add(params, "rows", 1, 16, 1).name("Rows").onChange(build);
  gui
    .add(
      {
        reseed: () => {
          params.seed = Math.floor(Math.random() * 10000);
          seedField.updateDisplay();
          build();
        },
      },
      "reseed",
    )
    .name("Reseed");

  return () => {
    gui.destroy();
    clear();
    palette.forEach((m) => m.dispose());
    scene.remove(grid);
    dispose();
  };
}
