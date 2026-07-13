import GUI from "lil-gui";
import { centerObject, Vase, VaseGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Vase" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  // The five radii ARE the vase. There is no formula here, and that is the point.
  const params = {
    foot: 0.55,
    lowerBelly: 0.95,
    waist: 0.8,
    shoulder: 0.5,
    lip: 0.62,
    height: 2.4,
    profileSegments: 40,
    radialSegments: 32,
  };

  const options = () => ({
    radii: [params.foot, params.lowerBelly, params.waist, params.shoulder, params.lip],
    height: params.height,
    profileSegments: params.profileSegments,
    radialSegments: params.radialSegments,
  });

  const vase = new Vase(options());
  scene.add(vase);

  const rebuild = () => {
    vase.geometry.dispose();
    vase.geometry = new VaseGeometry(options());
    centerObject(vase);
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

  rebuild();

  return () => {
    gui.destroy();
    vase.geometry.dispose();
    vase.material.dispose();
    dispose();
  };
}
