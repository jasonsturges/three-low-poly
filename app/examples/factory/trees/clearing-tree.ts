import GUI from "lil-gui";
import { Color, Mesh, MeshStandardMaterial } from "three";
import { ClearingTreeGeometry, type ClearingTreeGeometryOptions, GroundGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Clearing Tree",
  description:
    "A tall, open-trunked gnarled tree — the single tree from a clearing forest, isolated. It differs from " +
    "the Gnarled Tree in the one way that matters: the lower trunk is kept OPEN. The trunk is nudged back " +
    "toward vertical at every step and withholds its first limbs until several steps up, so the bole rises " +
    "clear before it branches. That is what lets something ring a clean trunk — an iron guard, a bench, a " +
    "lantern — instead of fouling a thicket of low boughs. Bare bark, one material, one merged geometry.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x8fa6b8, cameraPosition: [7, 5, 8] });
  const { scene, dispose } = handle;

  // The shared tree-example framework: ground grid at y=0, `frameObject` for the camera, Measured readout.
  // Pale sky here, as with the gnarled tree — a bare silhouette reads well against it.
  const ground = new GroundGrid({ size: 16, divisions: 16 });
  scene.add(ground);

  const params: Required<ClearingTreeGeometryOptions> = {
    trunkRadius: 0.28,
    segmentLength: 0.76,
    trunkSteps: 7,
    seed: 1,
    baseRise: 0.3,
  };

  const colors = { bark: "#29211d" };
  const stats = { triangles: 0, height: "", baseY: "" };

  // A geometry class, so the consumer owns the material — unlike the Autumn and Apple trees, whose instanced
  // foliage and fruit make their palettes part of the asset.
  const bark = new MeshStandardMaterial({
    color: new Color(colors.bark),
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  const tree = new Mesh(new ClearingTreeGeometry(params), bark);
  tree.castShadow = tree.receiveShadow = true;
  scene.add(tree);

  const refresh = () => {
    const geometry = tree.geometry;
    stats.triangles = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    stats.height = (box.max.y - box.min.y).toFixed(2);
    stats.baseY = box.min.y.toExponential(2);
  };

  const rebuild = () => {
    tree.geometry.dispose();
    tree.geometry = new ClearingTreeGeometry(params);
    refresh();
  };
  refresh();
  // Framed ONCE, deliberately not inside `refresh`. `frameObject` recomputes the camera DISTANCE
  // from the object's bounding sphere, so calling it on every rebuild snaps the zoom back and throws
  // away whatever the viewer had set.
  frameObject(handle, tree, { fit: 1.25 });

  const gui = new GUI();
  gui.title("Clearing Tree");
  gui.add(params, "seed", 1, 9999, 1).name("Seed").onChange(rebuild);

  const trunk = gui.addFolder("Trunk");
  trunk.add(params, "trunkRadius", 0.12, 0.6, 0.01).name("Trunk Radius").onChange(rebuild);
  trunk.add(params, "segmentLength", 0.4, 1.2, 0.02).name("Segment Length").onChange(rebuild);
  // This is what makes the tree tall. Below 4 the bole never clears, and the open-trunk character is lost —
  // the first limbs are withheld until step 3 regardless.
  trunk.add(params, "trunkSteps", 3, 12, 1).name("Trunk Steps").onChange(rebuild);
  // 0 restores the original tilted base, which sinks below the grid — the bug the rise exists to fix.
  trunk.add(params, "baseRise", 0, 1, 0.05).name("Base Rise").onChange(rebuild);
  trunk.open();

  // No rebuild — geometry is untouched by the bark colour.
  const material = gui.addFolder("Material");
  material.addColor(colors, "bark").name("Bark").onChange(() => bark.color.set(colors.bark));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "triangles").name("Triangles").listen().disable();
  readout.add(stats, "height").name("Height").listen().disable();
  // Should read ~0 at every seed and every parameter.
  readout.add(stats, "baseY").name("Base Y").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    tree.geometry.dispose();
    bark.dispose();
    ground.dispose();
    dispose();
  };
}
