import GUI from "lil-gui";
import { GnarledTree, GnarledTreeGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Gnarled Tree" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x8fa6b8, cameraPosition: [5, 4, 6] });

  const params = {
    seed: 1337,
    maxDepth: 4,
    trunkRadius: 0.24,
    segmentLength: 0.5,
    gnarl: 1,
    taper: 0.86,
    baseRise: 0.35,
    rootFlare: 1.5,
    sides: 5,
    smoothing: 4,
  };

  const stats = { triangles: 0 };

  const tree = new GnarledTree(params);
  scene.add(tree);

  const rebuild = () => {
    tree.geometry.dispose();
    tree.geometry = new GnarledTreeGeometry(params);
    stats.triangles = tree.geometry.index ? tree.geometry.index.count / 3 : 0;
  };

  const gui = new GUI();
  gui.title("Gnarled Tree");
  gui.add(params, "seed", 1, 9999, 1).name("Seed").onChange(rebuild);
  gui.add(params, "maxDepth", 1, 6, 1).name("Max Depth").onChange(rebuild);
  gui.add(params, "trunkRadius", 0.05, 0.6, 0.01).name("Trunk Radius").onChange(rebuild);
  gui.add(params, "segmentLength", 0.15, 1.2, 0.05).name("Segment Length").onChange(rebuild);

  const growth = gui.addFolder("Growth");
  growth.add(params, "gnarl", 0, 2.5, 0.05).name("Gnarl").onChange(rebuild);
  growth.add(params, "taper", 0.6, 0.98, 0.01).name("Taper").onChange(rebuild);

  const root = gui.addFolder("Root");
  // Drive this to 0 and the trunk gnarls straight out of the ground — its base tilts, and the tree
  // no longer sits flat. That is the bug; the rise is the fix, and it lives in the path.
  root.add(params, "baseRise", 0, 1.2, 0.05).name("Base Rise").onChange(rebuild);
  root.add(params, "rootFlare", 1, 3, 0.05).name("Root Flare").onChange(rebuild);
  root.open();

  const mesh = gui.addFolder("Mesh");
  // 3 gives triangular branches; 5–6 reads as round.
  mesh.add(params, "sides", 3, 12, 1).name("Branch Sides").onChange(rebuild);
  // 1 is a faceted, hard-cornered gnarl; 4+ turns it into a genuine curve.
  mesh.add(params, "smoothing", 1, 8, 1).name("Smoothing").onChange(rebuild);
  mesh.add(stats, "triangles").name("Triangles").listen().disable();

  rebuild();

  return () => {
    gui.destroy();
    tree.geometry.dispose();
    tree.material.dispose();
    dispose();
  };
}
