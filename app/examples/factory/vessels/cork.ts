import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial } from "three";
import { CorkGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { gradientBackdrop } from "../../../framework/gradientBackdrop";

export const meta = { title: "Cork" };

export default function (container: HTMLElement) {
  const handle = createScene(container);
  const { scene, dispose } = handle;
  const disposeBackdrop = gradientBackdrop(scene);

  const params = {
    topRadius: 0.61,
    radius: 0.52,
    bottomRadius: 0.36,
    upperHeight: 0.18,
    lowerHeight: 0.28,
    radialSegments: 16,
  };

  const material = new MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.9, metalness: 0, flatShading: true });
  const mesh = new Mesh(new CorkGeometry(params), material);
  mesh.castShadow = true;
  scene.add(mesh);
  frameObject(handle, mesh);

  const rebuild = () => {
    mesh.geometry.dispose();
    mesh.geometry = new CorkGeometry(params);
    frameObject(handle, mesh, { dolly: false });
  };

  const gui = new GUI();
  gui.title("Cork");
  // Top down: the head, the MIDDLE seal (where the cork meets the rim), then the tip.
  gui.add(params, "topRadius", 0.05, 1, 0.01).name("Top Radius").onChange(rebuild);
  gui.add(params, "radius", 0.1, 1, 0.01).name("Radius").onChange(rebuild);
  gui.add(params, "bottomRadius", 0.05, 1, 0.01).name("Bottom Radius").onChange(rebuild);
  // Upper taper (above the vessel). Set to 0 for a flat-topped lid.
  gui.add(params, "upperHeight", 0, 1, 0.01).name("Upper Height").onChange(rebuild);
  // Lower taper (into the neck). Equal upper/lower makes a wine cork.
  gui.add(params, "lowerHeight", 0.05, 1, 0.01).name("Lower Height").onChange(rebuild);
  gui.add(params, "radialSegments", 3, 48, 1).name("Radial Segments").onChange(rebuild);

  return () => {
    gui.destroy();
    mesh.geometry.dispose();
    material.dispose();
    disposeBackdrop();
    dispose();
  };
}
