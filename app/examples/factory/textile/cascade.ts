import GUI from "lil-gui";
import { DirectionalLight, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { CascadeGeometry, type CascadePleat } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Cascade",
  description:
    "The pleated tail beside a swag — a jabot. An accordion of cloth hung vertically and trimmed on one " +
    "straight diagonal; the sawtooth hem is not modelled, it is what a straight cut becomes once the " +
    "cloth is folded, so there are always exactly as many steps as pleats. Fabric Width is the conserved " +
    "quantity: opening the flare gives the same cloth more width to cover, so the fullness falls and the " +
    "folds shallow out on their own. Origin is the board at y = 0, with the drop hanging negative. " +
    "Needs `side: DoubleSide` — it is a sheet with no thickness. Worked out in `studies/drape/cascade`.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x11151b, cameraPosition: [0.7, -0.5, 2.6] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff2e0, 1.8);
  // Raking, so each crease shadows the flat beside it. A cascade is nothing but creases.
  key.position.set(2.6, 2.2, 3.6);
  const fill = new DirectionalLight(0x8ea8cc, 0.35);
  fill.position.set(-3, 0.4, -2);
  scene.add(key, fill);

  // `DoubleSide` is not a style choice here — the geometry is a single surface with no thickness.
  const velvet = new MeshStandardMaterial({
    color: 0x1f5b45,
    roughness: 0.95,
    side: DoubleSide,
    flatShading: true,
  });

  const params = {
    fabricWidth: 2.4,
    topWidth: 0.34,
    bottomWidth: 0.62,
    pleats: 6,
    pleat: "knife" as CascadePleat,
    shortDrop: 0.55,
    longDrop: 1.8,
    roll: 0.06,
    widthSegments: 240,
    heightSegments: 40,
    triangles: "",
  };

  let mesh = new Mesh(new CascadeGeometry(params), velvet);
  scene.add(mesh);

  const rebuild = () => {
    mesh.geometry.dispose();
    scene.remove(mesh);
    mesh = new Mesh(new CascadeGeometry(params), velvet);
    scene.add(mesh);
    params.triangles = `${mesh.geometry.getIndex()!.count / 3} triangles · ${params.pleats} steps`;
  };
  rebuild();
  frameObject(handle, mesh, { fit: 1.3 });

  const gui = new GUI();
  gui.title("Cascade");

  const cloth = gui.addFolder("Cloth");
  // The conserved quantity. Everything else is derived from it.
  cloth.add(params, "fabricWidth", 0.6, 5, 0.05).name("Fabric Width").onChange(rebuild);
  cloth.add(params, "pleats", 2, 16, 1).name("Pleats").onChange(rebuild);
  cloth.add(params, "pleat", { "Knife (sharp)": "knife", "Sine (soft)": "sine" }).name("Pleat").onChange(rebuild);
  cloth.open();

  const cut = gui.addFolder("Cut");
  cut.add(params, "shortDrop", 0.1, 2, 0.05).name("Short Drop").onChange(rebuild);
  cut.add(params, "longDrop", 0.2, 3.5, 0.05).name("Long Drop").onChange(rebuild);
  cut.open();

  const flare = gui.addFolder("Flare");
  flare.add(params, "topWidth", 0.08, 2, 0.02).name("Width at Board").onChange(rebuild);
  // Widen this and the folds let themselves out — the cloth is fixed, so the fullness falls.
  flare.add(params, "bottomWidth", 0.08, 2, 0.02).name("Width at Hem").onChange(rebuild);
  flare.add(params, "roll", -0.3, 0.3, 0.01).name("Roll").onChange(rebuild);
  flare.open();

  const mesh_ = gui.addFolder("Mesh");
  // Rounded up to a multiple of Pleats, so the crease apexes are always sampled.
  mesh_.add(params, "widthSegments", 12, 480, 6).name("Width Segments").onChange(rebuild);
  mesh_.add(params, "heightSegments", 4, 120, 4).name("Height Segments").onChange(rebuild);
  mesh_.add(params, "triangles").name("Built").listen().disable();

  return () => {
    gui.destroy();
    mesh.geometry.dispose();
    velvet.dispose();
    dispose();
  };
}
