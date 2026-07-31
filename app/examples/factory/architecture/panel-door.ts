import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { GroundGrid, PanelDoorGeometry, type PanelDoorGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Panel Door",
  description:
    "A four-panel door in frame-and-panel construction: two stiles running the full height, three rails " +
    "and two muntins butting into them, and four raised panels floating in the frame's grooves. Turn on " +
    "Molding for a mitered ovolo around each opening. The knob sits on `lockRailY`, which the geometry " +
    "reports rather than the scene assuming.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x9aa7b2,
    cameraPosition: [1.5, 1.9, 3.0],
  });

  controls.target.set(0, 1.0, 0);
  controls.update();

  const floor = new GroundGrid({ size: 8, planeColor: 0x3f4954, gridColor: 0x4c5866 });
  scene.add(floor);

  const params: Required<PanelDoorGeometryOptions> = {
    width: 0.813,
    height: 2.032,
    thickness: 0.045,
    stileWidth: 0.115,
    topRail: 0.115,
    lockRail: 0.2,
    bottomRail: 0.235,
    lockRailPosition: 0.44,
    muntinWidth: 0.1,
    panel: "raised",
    panelThickness: 0.018,
    bevelWidth: 0.055,
    tongueThickness: 0.008,
    grooveDepth: 0.012,
    molding: true,
    moldingWidth: 0.022,
    moldingHeight: 0.012,
    moldingSegments: 4,
  };

  // Flat shading, because a raised panel is nothing but planes meeting at angles — smooth normals would
  // average away the shadow line that makes it read as raised at all.
  const paint = new MeshStandardMaterial({ color: 0xc7d0da, roughness: 0.75, flatShading: true });
  const brass = new MeshStandardMaterial({ color: 0xb8933f, roughness: 0.35, metalness: 0.8 });
  const knobGeometry = new SphereGeometry(0.033, 12, 8);

  let door = new Mesh(new PanelDoorGeometry(params), paint);
  const knob = new Mesh(knobGeometry, brass);
  scene.add(door, knob);

  const place = () => {
    door.castShadow = true;
    door.receiveShadow = true;
    // The geometry reports where its lock rail landed, so the knob follows the door instead of being
    // pinned to a number that stops being true the moment the proportions change.
    const geometry = door.geometry as PanelDoorGeometry;
    knob.position.set(params.width / 2 - params.stileWidth / 2, geometry.lockRailY, params.thickness / 2 + 0.02);
  };
  place();

  const rebuild = () => {
    door.geometry.dispose();
    door.geometry = new PanelDoorGeometry(params);
    place();
  };

  const gui = new GUI();
  gui.title("Panel Door");

  const leaf = gui.addFolder("Leaf");
  leaf.add(params, "width", 0.6, 1.1, 0.005).name("Width").onChange(rebuild);
  leaf.add(params, "height", 1.6, 2.4, 0.01).name("Height").onChange(rebuild);
  leaf.add(params, "thickness", 0.025, 0.09, 0.001).name("Thickness").onChange(rebuild);
  leaf.open();

  const frame = gui.addFolder("Frame");
  frame.add(params, "stileWidth", 0.06, 0.2, 0.005).name("Stile Width").onChange(rebuild);
  frame.add(params, "topRail", 0.06, 0.25, 0.005).name("Top Rail").onChange(rebuild);
  // The deepest member on a traditional door — it is the one that gets kicked.
  frame.add(params, "bottomRail", 0.06, 0.35, 0.005).name("Bottom Rail").onChange(rebuild);
  frame.add(params, "lockRail", 0.08, 0.35, 0.005).name("Lock Rail").onChange(rebuild);
  // A fraction of the height, so the proportions survive a resize.
  frame.add(params, "lockRailPosition", 0.25, 0.6, 0.005).name("Lock Rail Height").onChange(rebuild);
  frame.add(params, "muntinWidth", 0.05, 0.2, 0.005).name("Muntin Width").onChange(rebuild);
  frame.open();

  const panel = gui.addFolder("Panel");
  panel
    .add(params, "panel", { "Raised (fielded)": "raised", "Flat (Shaker)": "flat" })
    .name("Style")
    .onChange(rebuild);
  panel.add(params, "panelThickness", 0.008, 0.03, 0.001).name("Thickness").onChange(rebuild);
  panel.add(params, "bevelWidth", 0.01, 0.12, 0.005).name("Bevel Width").onChange(rebuild);
  panel.add(params, "tongueThickness", 0.004, 0.02, 0.001).name("Tongue").onChange(rebuild);
  panel.add(params, "grooveDepth", 0, 0.03, 0.001).name("Groove Depth").onChange(rebuild);
  panel.open();

  const molding = gui.addFolder("Molding");
  molding.add(params, "molding").name("Planted Molding").onChange(rebuild);
  molding.add(params, "moldingWidth", 0.008, 0.05, 0.001).name("Width").onChange(rebuild);
  molding.add(params, "moldingHeight", 0.004, 0.03, 0.001).name("Height").onChange(rebuild);
  // The low-poly knob on the section, exactly as `segments` is on a curve: 1 is a chamfer, 12 is turned.
  molding.add(params, "moldingSegments", 1, 12, 1).name("Segments").onChange(rebuild);
  molding.open();

  return () => {
    gui.destroy();
    door.geometry.dispose();
    knobGeometry.dispose();
    paint.dispose();
    brass.dispose();
    floor.dispose();
    dispose();
  };
}
