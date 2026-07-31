import GUI from "lil-gui";
import { Group, Mesh, MeshStandardMaterial } from "three";
import {
  EdgedBoxGeometry,
  type EdgeAxis,
  type EdgeEnds,
  type EdgeStyle,
  GroundGrid,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Edged Box",
  description:
    "A box with its edges chamfered, rounded, or coved along one axis — built as a loft between offset " +
    "loops rather than by rounding edges, so there is no corner case and nothing is trimmed. Round and " +
    "cove are the same construction bowed the other way, which is why an inside and an outside edge are " +
    "one option. `axis` moves the treatment without rotating the dimensions: `width` is always the extent " +
    "on X. Segments is the low-poly knob — at 1 a round collapses onto its chord, which is a chamfer.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x9aa7b2,
    cameraPosition: [1.5, 1.2, 1.9],
  });

  controls.target.set(0, 0.25, 0);
  controls.update();

  const floor = new GroundGrid({ size: 6, planeColor: 0x3f4954, gridColor: 0x4c5866 });
  scene.add(floor);

  // Flat shading, because the whole point is to see the facets a loft leaves — and a band that shades in
  // two tones is a band that is not planar.
  const material = new MeshStandardMaterial({ color: 0xd4c9b4, roughness: 0.65, flatShading: true });

  const params = {
    width: 0.9,
    height: 0.5,
    depth: 0.6,
    edge: "round" as EdgeStyle,
    radius: 0.08,
    segments: 4,
    axis: "y" as EdgeAxis,
    ends: "both" as EdgeEnds,
  };

  const stage = new Group();
  scene.add(stage);

  let box = new Mesh(new EdgedBoxGeometry(params), material);
  box.castShadow = true;
  box.receiveShadow = true;
  stage.add(box);

  const rebuild = () => {
    box.geometry.dispose();
    box.geometry = new EdgedBoxGeometry(params);
  };

  const gui = new GUI();
  gui.title("Edged Box");

  const edge = gui.addFolder("Edge");
  edge
    .add(params, "edge", {
      Sharp: "sharp",
      "Chamfer (flat)": "chamfer",
      "Round (convex)": "round",
      "Cove (concave)": "cove",
    })
    .name("Treatment")
    .onChange(rebuild);
  edge.add(params, "radius", 0, 0.3, 0.005).name("Radius").onChange(rebuild);
  edge.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);
  edge
    .add(params, "axis", { "Y — top and bottom": "y", "X — left and right": "x", "Z — front and back": "z" })
    .name("Axis")
    .onChange(rebuild);
  // A plinth is worked at one end; a raised panel at both.
  edge.add(params, "ends", { Both: "both", "Low end": "low", "High end": "high", None: "none" })
    .name("Ends")
    .onChange(rebuild);
  edge.open();

  const box_ = gui.addFolder("Box");
  box_.add(params, "width", 0.2, 1.6, 0.01).name("Width").onChange(rebuild);
  box_.add(params, "height", 0.1, 1.2, 0.01).name("Height").onChange(rebuild);
  box_.add(params, "depth", 0.2, 1.6, 0.01).name("Depth").onChange(rebuild);
  box_.open();

  return () => {
    gui.destroy();
    box.geometry.dispose();
    material.dispose();
    floor.dispose();
    dispose();
  };
}
