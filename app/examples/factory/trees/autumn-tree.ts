import GUI from "lil-gui";
import { AutumnTree, type AutumnTreeOptions, GroundGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Autumn Tree",
  description:
    "A deterministic crooked deciduous tree: one merged low-poly branch skeleton and a sparse, instanced " +
    "crown of faceted rust, ochre, and deep-red leaf clusters. The trunk's intentional lean supplies the " +
    "large silhouette; recursive branching supplies the gnarl. Two draw calls at any crown size — the " +
    "branches merge, and every leaf cluster is one InstancedMesh tinted per instance. It grows from the " +
    "origin, so the base rests on y=0 and the grid confirms it.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [6, 4, 7] });
  const { scene, dispose } = handle;

  // Shares the tree-example framework with `gnarled-tree`: a ground grid at y=0, `frameObject` for the
  // camera, and a Measured readout. The BACKGROUND is the one thing that differs — bare branches read well on
  // pale sky, but warm foliage against dark bark needs a dark field or it washes out.
  const ground = new GroundGrid({ size: 14, divisions: 14 });
  scene.add(ground);

  const params: Required<AutumnTreeOptions> = {
    seed: 0xa711,
    trunkRadius: 0.32,
    segmentLength: 0.66,
    maxDepth: 4,
    leafDensity: 0.72,
    barkColor: "#332419",
    leafPalette: ["#8d3c1d", "#aa5b21", "#c27a28", "#6e3120", "#b68a32"],
    leafSize: 0.38,
    clustersPerPoint: 2,
    baseRise: 0.35,
  };

  const stats = { branchTriangles: 0, leafClusters: 0, drawCalls: 2, baseY: "" };

  let tree = new AutumnTree(params);
  scene.add(tree);

  const refresh = () => {
    const geometry = tree.branches.geometry;
    stats.branchTriangles = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;
    geometry.computeBoundingBox();
    stats.baseY = geometry.boundingBox!.min.y.toExponential(2);
    stats.leafClusters = tree.leaves.count;
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
  gui.title("Autumn Tree");
  gui.add(params, "seed", 1, 0xffff, 1).name("Seed").onChange(rebuild);

  const trunk = gui.addFolder("Trunk");
  trunk.add(params, "trunkRadius", 0.15, 0.6, 0.01).name("Trunk Radius").onChange(rebuild);
  trunk.add(params, "segmentLength", 0.35, 1, 0.01).name("Segment Length").onChange(rebuild);
  // Past 2 the taper reaches genuinely fine twigs; below that the crown points sit on thick stubs.
  trunk.add(params, "maxDepth", 2, 5, 1).name("Branch Depth").onChange(rebuild);
  trunk.open();

  // 0 restores the original tilted base, which sinks below the grid — the bug the rise exists to fix.
  trunk.add(params, "baseRise", 0, 1.2, 0.05).name("Base Rise").onChange(rebuild);

  const crown = gui.addFolder("Crown");
  // 0 strips the tree to its winter skeleton, which is the clearest look at the branching itself.
  crown.add(params, "leafDensity", 0, 1, 0.01).name("Leaf Density").onChange(rebuild);
  crown.add(params, "leafSize", 0.15, 0.7, 0.01).name("Leaf Size").onChange(rebuild);
  crown.add(params, "clustersPerPoint", 1, 5, 1).name("Clusters / Point").onChange(rebuild);
  crown.open();

  const readout = gui.addFolder("Measured");
  readout.add(stats, "branchTriangles").name("Branch Tris").listen().disable();
  readout.add(stats, "leafClusters").name("Leaf Clusters").listen().disable();
  readout.add(stats, "drawCalls").name("Draw Calls").listen().disable();
  // Should read ~0 at every seed — the tree grows from the origin rather than straddling it.
  readout.add(stats, "baseY").name("Base Y").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    tree.dispose();
    ground.dispose();
    dispose();
  };
}
