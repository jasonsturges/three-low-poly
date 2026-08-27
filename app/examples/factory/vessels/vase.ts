import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial } from "three";
import { VaseGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { gradientBackdrop } from "../../../framework/gradientBackdrop";

export const meta = { title: "Vase" };

export default function (container: HTMLElement) {
  const handle = createScene(container);
  const { scene, dispose } = handle;
  const disposeBackdrop = gradientBackdrop(scene);
  let framed = false;

  // The five radii ARE the vase — control points, not a formula.
  const params = {
    foot: 0.55,
    lowerBelly: 0.95,
    waist: 0.8,
    shoulder: 0.5,
    lip: 0.62,
    height: 2.4,
    profileSegments: 40,
    radialSegments: 32,
    // Bands step the material index at fractions of height. Off leaves a single group.
    banded: true,
    lower: 0.33,
    upper: 0.66,
  };

  const bands = () => (params.banded ? [params.lower, params.upper].sort((a, b) => a - b) : []);

  const options = () => ({
    radii: [params.foot, params.lowerBelly, params.waist, params.shoulder, params.lip],
    height: params.height,
    profileSegments: params.profileSegments,
    radialSegments: params.radialSegments,
    bands: bands(),
  });

  // One material per band plus one. Three distinct colors so the group boundaries read at a glance.
  const lower = new MeshStandardMaterial({ color: 0x4f7488, roughness: 0.55, flatShading: true });
  const middle = new MeshStandardMaterial({ color: 0xd7d2c6, roughness: 0.5, flatShading: true });
  const upper = new MeshStandardMaterial({ color: 0xb06a3c, roughness: 0.55, flatShading: true });
  const grouped = [lower, middle, upper];

  const vase: Mesh<VaseGeometry, MeshStandardMaterial | MeshStandardMaterial[]> = new Mesh(
    new VaseGeometry(options()),
    grouped,
  );
  vase.castShadow = true;
  vase.receiveShadow = true;
  scene.add(vase);

  const rebuild = () => {
    vase.geometry.dispose();
    const geometry = new VaseGeometry(options());
    vase.geometry = geometry;
    // Unbanded, the geometry has no groups, and an array would draw with the first material only.
    vase.material = geometry.groups.length > 0 ? grouped : middle;
    // Frame once; follow (without re-fitting) on rebuilds so the viewer's zoom survives.
    frameObject(handle, vase, { dolly: !framed });
    framed = true;
  };

  const gui = new GUI();
  gui.title("Vase");

  // Drag the lower belly up for a bulbous bottom; drag the shoulder up instead and the bulge climbs.
  // Pinch the waist for an hourglass. No single formula could do all three.
  const silhouette = gui.addFolder("Silhouette (the control points)");
  silhouette.add(params, "foot", 0.05, 1.5, 0.01).name("Foot").onChange(rebuild);
  silhouette.add(params, "lowerBelly", 0.05, 1.5, 0.01).name("Lower Belly").onChange(rebuild);
  silhouette.add(params, "waist", 0.05, 1.5, 0.01).name("Waist").onChange(rebuild);
  silhouette.add(params, "shoulder", 0.05, 1.5, 0.01).name("Shoulder").onChange(rebuild);
  silhouette.add(params, "lip", 0.05, 1.5, 0.01).name("Lip").onChange(rebuild);
  silhouette.open();

  gui.add(params, "height", 0.5, 5, 0.1).name("Height").onChange(rebuild);
  gui.add(params, "profileSegments", 4, 120, 1).name("Profile Segments").onChange(rebuild);
  // Drop to 6 and it becomes a faceted, hand-thrown pot. The low-poly knob, on a lathe.
  gui.add(params, "radialSegments", 3, 64, 1).name("Radial Segments").onChange(rebuild);

  // A boundary snaps to a profile ring, so Profile Segments sets how precisely a band can be placed.
  const banding = gui.addFolder("Bands");
  banding.add(params, "banded").name("Banded").onChange(rebuild);
  banding.add(params, "lower", 0.05, 0.95, 0.01).name("Lower Band").onChange(rebuild);
  banding.add(params, "upper", 0.05, 0.95, 0.01).name("Upper Band").onChange(rebuild);
  banding.open();

  rebuild();

  return () => {
    gui.destroy();
    vase.geometry.dispose();
    lower.dispose();
    middle.dispose();
    upper.dispose();
    disposeBackdrop();
    dispose();
  };
}
