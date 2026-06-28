import { Mesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { BoneGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Bone" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const parameters = {
    radiusTop: 0.1,
    radiusBottom: 0.1,
    height: 0.4,
    radialSegments: 8,
  };

  const boneMaterial = new MeshStandardMaterial({ color: 0xffffff });
  let boneGeometry = new BoneGeometry();
  let bone = new Mesh(boneGeometry, boneMaterial);
  scene.add(bone);

  const rebuild = () => {
    scene.remove(bone);
    boneGeometry.dispose();
    boneGeometry = new BoneGeometry(
      parameters.radiusTop,
      parameters.radiusBottom,
      parameters.height,
      parameters.radialSegments,
    );
    bone = new Mesh(boneGeometry, boneMaterial);
    scene.add(bone);
  };

  const gui = new GUI();
  const boneFolder = gui.addFolder("Bone");
  boneFolder.add(parameters, "radiusTop", 0.05, 0.5).onChange(rebuild);
  boneFolder.add(parameters, "radiusBottom", 0.05, 0.5).onChange(rebuild);
  boneFolder.add(parameters, "height", 0.2, 1.0).onChange(rebuild);
  boneFolder.add(parameters, "radialSegments", 3, 32).step(1).onChange(rebuild);
  boneFolder.open();

  return () => {
    gui.destroy();
    boneGeometry.dispose();
    boneMaterial.dispose();
    dispose();
  };
}