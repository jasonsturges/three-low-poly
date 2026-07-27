import GUI from "lil-gui";
import { AutumnTree, type AutumnTreeOptions, GroundGrid } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";

export const meta = {
  title: "Cherry Tree",
  description:
    "A single spring cherry, isolated from a grove. NO new geometry — this is Autumn Tree under a different " +
    "SPECIFICATION: pale blossom palette, warmer bark, smaller leaf clusters, and three per crown point " +
    "instead of two. Same mechanics, different spec, which is why the library ships one class rather than " +
    "two. Compare it against the Autumn Tree example: identical branching, entirely different season.",
};

/**
 * The cherry specification, lifted from the source scene's grove. Its hero tree is the one isolated here;
 * the grove's other three are the same spec at smaller `trunkRadius`, `leafDensity`, and scale.
 */
const CHERRY: Required<AutumnTreeOptions> = {
  seed: 0xc401,
  trunkRadius: 0.37,
  segmentLength: 0.76,
  maxDepth: 4,
  leafDensity: 0.86,
  barkColor: "#493630",
  leafPalette: ["#f7d6dc", "#efb9c5", "#f4c8d2", "#dfa2b2", "#f9e2e4"],
  leafSize: 0.27,
  clustersPerPoint: 3,
  baseRise: 0.35,
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [6, 4, 7] });
  const { scene, dispose } = handle;

  // The shared tree-example framework: ground grid at y=0, `frameObject` for the camera, Measured readout.
  const ground = new GroundGrid({ size: 14, divisions: 14 });
  scene.add(ground);

  const params: Required<AutumnTreeOptions> = { ...CHERRY };
  const stats = { branchTriangles: 0, blossomClusters: 0, drawCalls: 2, baseY: "" };

  let tree = new AutumnTree(params);
  scene.add(tree);

  const refresh = () => {
    const geometry = tree.branches.geometry;
    stats.branchTriangles = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;
    geometry.computeBoundingBox();
    stats.baseY = geometry.boundingBox!.min.y.toExponential(2);
    stats.blossomClusters = tree.leaves.count;
  };
  refresh();
  // Framed ONCE, deliberately not inside `refresh`. `frameObject` recomputes the camera DISTANCE from
  // the object's bounding sphere, so calling it on every rebuild snaps the zoom back and throws away
  // whatever the viewer had set.
  frameObject(handle, tree, { fit: 1.25 });

  const rebuild = () => {
    tree.dispose();
    scene.remove(tree);
    tree = new AutumnTree(params);
    scene.add(tree);
    refresh();
  };

  const gui = new GUI();
  gui.title("Cherry Tree");
  gui.add(params, "seed", 1, 0xffff, 1).name("Seed").onChange(rebuild);

  const trunk = gui.addFolder("Trunk");
  trunk.add(params, "trunkRadius", 0.15, 0.6, 0.01).name("Trunk Radius").onChange(rebuild);
  trunk.add(params, "segmentLength", 0.35, 1, 0.01).name("Segment Length").onChange(rebuild);
  trunk.add(params, "maxDepth", 2, 5, 1).name("Branch Depth").onChange(rebuild);
  trunk.add(params, "baseRise", 0, 1.2, 0.05).name("Base Rise").onChange(rebuild);
  trunk.open();

  const blossom = gui.addFolder("Blossom");
  blossom.add(params, "leafDensity", 0, 1, 0.01).name("Density").onChange(rebuild);
  // Smaller than the autumn leaf and packed three to a point — that combination is what reads as blossom
  // rather than foliage.
  blossom.add(params, "leafSize", 0.12, 0.5, 0.01).name("Cluster Size").onChange(rebuild);
  blossom.add(params, "clustersPerPoint", 1, 5, 1).name("Clusters / Point").onChange(rebuild);
  blossom.open();

  const readout = gui.addFolder("Measured");
  readout.add(stats, "branchTriangles").name("Branch Tris").listen().disable();
  readout.add(stats, "blossomClusters").name("Blossom Clusters").listen().disable();
  readout.add(stats, "drawCalls").name("Draw Calls").listen().disable();
  readout.add(stats, "baseY").name("Base Y").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    tree.dispose();
    ground.dispose();
    dispose();
  };
}
