import GUI from "lil-gui";
import { DirectionalLight, DoubleSide, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { createCheckerboardTexture, surfaceGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Surface Grid",
  description:
    "`surfaceGrid` skins an open grid of points — the sheet counterpart to `loft`. The difference is " +
    "topological rather than cosmetic: a loft's sections are closed RINGS and it wraps the last point of " +
    "each back onto the first, so an open sheet run through it folds over on itself along a seam that was " +
    "never there. This wraps in neither direction, which is what every parametric surface wants — a " +
    "curtain, a vault web, a sail, a NURBS patch on a grid, any `f(u, v)` at all. " +
    "Two things it does that a hand-rolled stitch usually does not. The face normal comes from the quad's " +
    "DIAGONALS, `(c − a) × (d − b)`, so it survives the near-collinear corners that appear wherever a " +
    "surface pinches — a swag cinched to its horns, a vault cell closing on its boss — where the ordinary " +
    "three-corner normal collapses to zero and shades black. And UVs are laid across the whole sheet " +
    "rather than per quad, so a texture maps as one image; turn on Checker to see it.",
};

/** A few `f(u, v)` surfaces, chosen so each exercises something different about the stitch. */
const SURFACES = {
  "Hanging sheet": (u: number, v: number) => {
    const x = (u - 0.5) * 2.4;
    return new Vector3(x, -v * 1.8 * (1 - 0.35 * x * x), Math.sin(u * Math.PI * 5) * 0.12 * v);
  },
  // Pinches to a point at both ends — the case the diagonal normal exists for.
  "Pinched at both ends": (u: number, v: number) => {
    const e = 1 - (2 * u - 1) ** 2;
    return new Vector3((u - 0.5) * 2.6, -v * 1.4 * e, Math.sin(v * Math.PI * 4) * 0.18 * v * e);
  },
  // Closes to a single point at the top: every row of the last band collapses.
  Cone: (u: number, v: number) => {
    const a = u * Math.PI * 2;
    return new Vector3(Math.cos(a) * (1 - v), (v - 0.5) * 2, Math.sin(a) * (1 - v));
  },
  Saddle: (u: number, v: number) =>
    new Vector3((u - 0.5) * 2.4, ((u - 0.5) ** 2 - (v - 0.5) ** 2) * 3, (v - 0.5) * 2.4),
};

type SurfaceName = keyof typeof SURFACES;

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [2.4, 1.2, 3.4] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.6);
  key.position.set(3, 4, 4);
  const fill = new DirectionalLight(0x8ea8cc, 0.45);
  fill.position.set(-3, 1, -3);
  scene.add(key, fill);

  // A DataTexture, so there is nothing to load. 8 texels reads as a clear grid across the sheet.
  const checker = createCheckerboardTexture({ size: 8 });

  // An open sheet has no inside, so both faces have to render.
  const material = new MeshStandardMaterial({
    color: 0xc8cedb,
    roughness: 0.7,
    side: DoubleSide,
    flatShading: true,
  });

  const params = {
    surface: "Pinched at both ends" as SurfaceName,
    columns: 60,
    rows: 40,
    flip: false,
    checkerOn: false,
    built: "",
  };

  const stage = new Group();
  scene.add(stage);

  const rebuild = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh) child.geometry.dispose();
    }
    stage.clear();

    const f = SURFACES[params.surface];
    const grid = Array.from({ length: params.rows + 1 }, (_, j) =>
      Array.from({ length: params.columns + 1 }, (_, i) => f(i / params.columns, j / params.rows)),
    );

    const geometry = surfaceGrid(grid, { flip: params.flip });
    stage.add(new Mesh(geometry, material));

    // A zero normal shades black rather than failing loudly, so it is worth counting rather than eyeing.
    const normals = geometry.getAttribute("normal").array;
    let zero = 0;
    for (let i = 0; i < normals.length; i += 3) {
      if (Math.hypot(normals[i]!, normals[i + 1]!, normals[i + 2]!) < 0.5) zero++;
    }
    params.built = `${geometry.getIndex()!.count / 3} triangles · ${zero} zero normals`;
  };

  rebuild();
  frameObject(handle, stage, { fit: 1.4 });

  const gui = new GUI();
  gui.title("Surface Grid");

  gui.add(params, "surface", Object.keys(SURFACES)).name("Surface").onChange(rebuild);
  gui.add(params, "columns", 3, 200, 1).name("Columns (u)").onChange(rebuild);
  gui.add(params, "rows", 2, 200, 1).name("Rows (v)").onChange(rebuild);
  // For when a shape's natural parameterization happens to face away from the viewer.
  gui.add(params, "flip").name("Flip Facing").onChange(rebuild);
  // UVs run across the WHOLE sheet, not per quad — one image, not one per face.
  gui
    .add(params, "checkerOn")
    .name("Checker")
    .onChange((on: boolean) => {
      material.map = on ? checker : null;
      material.needsUpdate = true;
    });
  gui.add(params, "built").name("Built").listen().disable();

  return () => {
    gui.destroy();
    for (const child of stage.children) if (child instanceof Mesh) child.geometry.dispose();
    material.dispose();
    checker.dispose();
    dispose();
  };
}
