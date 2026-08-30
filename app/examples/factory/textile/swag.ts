import GUI from "lil-gui";
import { DirectionalLight, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { SwagGeometry, type SwagSagCurve } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Swag",
  description:
    "Cloth hung between two pins and cinched to a knot at each end. One continuous surface: a macro sag " +
    "hanging each tier, a micro fold rippling down them, and the cinch `(1 − u²)` taking BOTH to zero at " +
    "the horns — which is what gathers the cloth without anything being cut or placed. A vertical cut " +
    "through the middle is a stack of waves, and it is a LOFT rather than a sweep precisely because that " +
    "profile's amplitude changes across the span. Origin is the pin line at y = 0, hanging negative. " +
    "Needs `side: DoubleSide`, because it is a sheet with no thickness. " +
    "Worked out in `studies/drape/gather`, with the curve itself settled in `studies/drape/swag`.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x11151b, cameraPosition: [0.3, -0.4, 3.4] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff2e0, 1.8);
  // Raking and to one side, because a fold only reads as depth if it shadows the one beside it.
  key.position.set(2.8, 2.2, 4);
  const fill = new DirectionalLight(0x8ea8cc, 0.35);
  fill.position.set(-3, 0.4, -2);
  scene.add(key, fill);

  // `DoubleSide` is required, not stylistic — the geometry is a surface with no thickness.
  const velvet = new MeshStandardMaterial({
    color: 0x1f5b45,
    roughness: 0.95,
    side: DoubleSide,
    flatShading: true,
  });

  const params = {
    span: 2,
    sag: 0.85,
    topSag: 0,
    sagPower: 1.2,
    folds: 3.5,
    foldDepth: 0.12,
    bulge: 0.1,
    taper: 0.16,
    sagCurve: "catenary" as SwagSagCurve,
    widthSegments: 90,
    heightSegments: 110,
    triangles: "",
  };

  let mesh = new Mesh(new SwagGeometry(params), velvet);
  scene.add(mesh);

  const rebuild = () => {
    mesh.geometry.dispose();
    scene.remove(mesh);
    mesh = new Mesh(new SwagGeometry(params), velvet);
    scene.add(mesh);
    params.triangles = `${mesh.geometry.getIndex()!.count / 3} triangles`;
  };
  rebuild();
  frameObject(handle, mesh, { fit: 1.3 });

  const gui = new GUI();
  gui.title("Swag");

  const shape = gui.addFolder("Swag");
  shape.add(params, "span", 0.6, 4, 0.05).name("Span").onChange(rebuild);
  shape.add(params, "sag", 0.1, 2, 0.02).name("Sag (hem)").onChange(rebuild);
  // 0 is a board-mounted swag, whose top edge is stapled straight. Lift it and the first visible fold
  // hangs on its own, the way a pole-mounted one does. The pins stay at y = 0 either way.
  shape.add(params, "topSag", 0, 1, 0.01).name("Sag (top)").onChange(rebuild);
  // Above 1 the tiers bunch toward the hem instead of stacking evenly. Cloth is not linear.
  shape.add(params, "sagPower", 0.6, 2.5, 0.05).name("Sag Power").onChange(rebuild);
  shape.add(params, "sagCurve", { Catenary: "catenary", Parabola: "parabola" }).name("Sag Curve").onChange(rebuild);
  shape.open();

  const fold = gui.addFolder("Folds");
  fold.add(params, "folds", 0, 9, 0.1).name("Fold Cycles").onChange(rebuild);
  fold.add(params, "foldDepth", 0, 0.4, 0.005).name("Fold Depth").onChange(rebuild);
  // Cloth has mass, so the lower tiers hang out over the ones above — the nested crescent.
  fold.add(params, "bulge", 0, 0.5, 0.01).name("Bulge").onChange(rebuild);
  // Narrows the upper tiers, because a higher fold spans less.
  fold.add(params, "taper", 0, 0.6, 0.01).name("Taper").onChange(rebuild);
  fold.open();

  const mesh_ = gui.addFolder("Mesh");
  mesh_.add(params, "widthSegments", 12, 200, 4).name("Width Segments").onChange(rebuild);
  // Carries the fold ripple, so it wants to be generous.
  mesh_.add(params, "heightSegments", 20, 300, 10).name("Height Segments").onChange(rebuild);
  mesh_.add(params, "triangles").name("Built").listen().disable();

  return () => {
    gui.destroy();
    mesh.geometry.dispose();
    velvet.dispose();
    dispose();
  };
}
