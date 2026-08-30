import GUI from "lil-gui";
import { DirectionalLight, DoubleSide, Group, Mesh, MeshStandardMaterial } from "three";
import { CurtainPanelGeometry, type CurtainPleat } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Curtain Panel",
  description:
    "A pleat wave lofted downward, with a tieback cinching it. FULLNESS is the design input — fabric " +
    "width over rod width, 2.5× being standard — and fold depth is nowhere on this class because it is " +
    "an OUTPUT: the cloth is cut once, and how deep its folds run is whatever fitting that fixed length " +
    "into the available width demands. The tieback is a constraint on WIDTH, not a force on cloth: " +
    "narrowing the span raises the local fullness and the folds deepen because they cannot do otherwise. " +
    "The leading edge runs through THREE anchors — rod, tieback, hem — which is what lets one class do " +
    "both real curtains. Leave Hem Pull at 0 and the panel flares back out into an hourglass, which is a " +
    "heavy curtain with material in the base. Set it equal to Pull and the edge falls straight from the " +
    "tie, parallel to the outer edge, which is a thin curtain with nothing to flare with. Above Pull it " +
    "keeps narrowing to the floor. " +
    "Origin is the rod at y = 0 with the outer edge at x = 0, so a pair is this geometry and its mirror. " +
    "Needs `side: DoubleSide`. Worked out in `studies/drape/pleating`.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x141821, cameraPosition: [2.4, -1.2, 4.4] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff2e0, 1.7);
  // Raking, because a pleat only reads as depth if something shadows it.
  key.position.set(3.5, 4, 5);
  const fill = new DirectionalLight(0x8ea8cc, 0.4);
  fill.position.set(-3, 1, -2.5);
  scene.add(key, fill);

  // `DoubleSide` is required, not stylistic — the geometry is a surface with no thickness.
  const fabric = new MeshStandardMaterial({
    color: 0xb8ac93,
    roughness: 0.92,
    side: DoubleSide,
    flatShading: true,
  });

  const params = {
    width: 1.4,
    drop: 3.2,
    fullness: 2.5,
    pleats: 9,
    pleat: "pinch" as CurtainPleat,
    relax: 0.55,
    tiebackHeight: 0.62,
    topPull: 0,
    pull: 0.42,
    hemPull: 0,
    slack: 0.5,
    widthSegments: 160,
    heightSegments: 40,
    pair: true,
    triangles: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of stage.children) if (child instanceof Mesh) child.geometry.dispose();
    stage.clear();
  };

  const rebuild = () => {
    clear();

    // One geometry, used twice. The panel's outer edge sits at x = 0, so a pair is this and its mirror —
    // rotated rather than negatively scaled, which would invert the winding.
    const geometry = new CurtainPanelGeometry(params);
    const gap = 0.04;

    const right = new Mesh(geometry, fabric);
    right.position.x = gap;
    stage.add(right);

    if (params.pair) {
      const left = new Mesh(geometry, fabric);
      left.position.x = -gap;
      left.rotation.y = Math.PI;
      stage.add(left);
    }

    params.triangles = `${geometry.getIndex()!.count / 3} triangles${params.pair ? " × 2" : ""}`;
  };

  rebuild();
  frameObject(handle, stage, { fit: 1.35 });

  const gui = new GUI();
  gui.title("Curtain Panel");

  const cloth = gui.addFolder("Cloth");
  // The design input. Fold depth is an output of it and is not an option anywhere.
  cloth.add(params, "fullness", 1.05, 3.5, 0.05).name("Fullness ×").onChange(rebuild);
  cloth.add(params, "pleats", 3, 24, 1).name("Pleats").onChange(rebuild);
  cloth
    .add(params, "pleat", { "Pinch (French)": "pinch", Pencil: "pencil", Box: "box", Knife: "knife" })
    .name("Heading")
    .onChange(rebuild);
  // A heading is stitched and holds its shape; a hem is free and takes the smooth one. 0 reads as wrong.
  cloth.add(params, "relax", 0, 1, 0.05).name("Relax to Hem").onChange(rebuild);
  cloth.open();

  const edge = gui.addFolder("Leading Edge");
  // Three anchors instead of one bump, so the halves above and below the tie tune independently.
  edge.add(params, "topPull", 0, 0.8, 0.01).name("Top Pull").onChange(rebuild);
  edge.add(params, "tiebackHeight", 0.05, 0.95, 0.01).name("Tieback Height").onChange(rebuild);
  edge.add(params, "pull", 0, 0.85, 0.01).name("Pull").onChange(rebuild);
  // 0 flares back out (heavy curtain); equal to Pull drops straight (thin curtain); above, it tapers.
  edge.add(params, "hemPull", 0, 0.85, 0.01).name("Hem Pull").onChange(rebuild);
  // 0 is a hard V at the tie, 1 bows both halves. Cloth sits between.
  edge.add(params, "slack", 0, 1, 0.05).name("Slack").onChange(rebuild);
  edge.open();

  const size = gui.addFolder("Panel");
  size.add(params, "width", 0.4, 3, 0.05).name("Width").onChange(rebuild);
  size.add(params, "drop", 1, 6, 0.1).name("Drop").onChange(rebuild);
  size.add(params, "pair").name("Pair").onChange(rebuild);

  const mesh = gui.addFolder("Mesh");
  // Rounded up so each pleat gets a multiple of four samples — the silhouette does not move with it.
  mesh.add(params, "widthSegments", 20, 400, 10).name("Width Segments").onChange(rebuild);
  mesh.add(params, "heightSegments", 4, 120, 4).name("Height Segments").onChange(rebuild);
  mesh.add(params, "triangles").name("Built").listen().disable();

  return () => {
    gui.destroy();
    clear();
    fabric.dispose();
    dispose();
  };
}
