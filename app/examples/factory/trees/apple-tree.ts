import GUI from "lil-gui";
import { AppleTree, type AppleTreeOptions, GroundGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Apple Tree",
  description:
    "A compact cultivated apple tree with a low, rounded crown. Six primary branches leave a short trunk, " +
    "each carrying a shoulder, a tip, and two twigs — orchard form rather than a wild gnarl, which is why " +
    "this is its own factory rather than a reparameterized Autumn Tree. Three draw calls at any size: merged " +
    "wood, one InstancedMesh of leaf clusters tinted per instance, and one of apples. Fruit and foliage " +
    "scatter independently, so an apple can hang where a leaf cluster was skipped.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [5, 3.5, 7] });
  const { scene, dispose } = handle;

  // The shared tree-example framework: a ground grid at y=0, `frameObject` for the camera, and a Measured
  // readout. Dark field, as in the source scene — the crown's greens and reds wash out on pale sky.
  const ground = new GroundGrid({ size: 10, divisions: 10 });
  scene.add(ground);

  const params: Required<AppleTreeOptions> = {
    seed: 0xa991,
    height: 3.4,
    crownRadius: 1.5,
    leafDensity: 0.82,
    appleCount: 18,
    baseRise: 0.25,
  };

  const stats = { woodTriangles: 0, leafClusters: 0, apples: 0, drawCalls: 3, baseY: "" };

  let tree = new AppleTree(params);
  scene.add(tree);

  const refresh = () => {
    const geometry = tree.wood.geometry;
    stats.woodTriangles = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;
    geometry.computeBoundingBox();
    stats.baseY = geometry.boundingBox!.min.y.toExponential(2);
    stats.leafClusters = tree.leaves.count;
    stats.apples = tree.apples.count;
  };
  refresh();
  // Framed ONCE, deliberately not inside `refresh`. `frameObject` recomputes the camera DISTANCE from
  // the object's bounding sphere, so calling it on every rebuild snaps the zoom back and throws away
  // whatever the viewer had set.
  frameObject(handle, tree, { fit: 1.25 });

  const rebuild = () => {
    tree.dispose();
    scene.remove(tree);
    tree = new AppleTree(params);
    scene.add(tree);
    refresh();
  };

  const gui = new GUI();
  gui.title("Apple Tree");
  gui.add(params, "seed", 1, 0xffff, 1).name("Seed").onChange(rebuild);

  const form = gui.addFolder("Form");
  form.add(params, "height", 2, 5, 0.05).name("Height").onChange(rebuild);
  // Branch reach scales from this, so widening it spreads the crown rather than just scaling the tree.
  form.add(params, "crownRadius", 0.8, 2.5, 0.05).name("Crown Radius").onChange(rebuild);
  // 0 restores the original tilted base, which sinks below the grid — the bug the rise exists to fix.
  form.add(params, "baseRise", 0, 1, 0.05).name("Base Rise").onChange(rebuild);
  form.open();

  const crown = gui.addFolder("Crown");
  crown.add(params, "leafDensity", 0.2, 1, 0.01).name("Leaf Density").onChange(rebuild);
  crown.add(params, "appleCount", 0, 48, 1).name("Apples").onChange(rebuild);
  crown.open();

  const readout = gui.addFolder("Measured");
  readout.add(stats, "woodTriangles").name("Wood Tris").listen().disable();
  readout.add(stats, "leafClusters").name("Leaf Clusters").listen().disable();
  readout.add(stats, "apples").name("Apple Count").listen().disable();
  readout.add(stats, "drawCalls").name("Draw Calls").listen().disable();
  // Should read ~0 at every seed and height.
  readout.add(stats, "baseY").name("Base Y").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    tree.dispose();
    ground.dispose();
    dispose();
  };
}
