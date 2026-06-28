import { DoubleSide, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from "three";
import GUI from "lil-gui";
import { Easing, centerObject, interpolateCurve } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Interpolate Curve Lathe (Points)" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    startRadius: 0.5,
    endRadius: 0.2,
    startHeight: 1,
    endHeight: 3,
    segments: 20,
    easingFunction: "sineInOut" as keyof typeof Easing,
  };

  const material = new MeshStandardMaterial({
    color: 0x0077ff,
    metalness: 0.3,
    roughness: 0.7,
    side: DoubleSide,
  });

  const buildPoints = () => [
    new Vector2(0.5, 0),
    new Vector2(0.5, params.startHeight),
    ...interpolateCurve(
      Easing[params.easingFunction],
      params.startRadius,
      params.endRadius,
      params.startHeight,
      params.endHeight,
      params.segments,
    ),
  ];

  const latheMesh = new Mesh(new LatheGeometry(buildPoints(), 32), material);
  scene.add(latheMesh);
  centerObject(latheMesh);

  const updateLatheGeometry = () => {
    latheMesh.geometry.dispose();
    latheMesh.geometry = new LatheGeometry(buildPoints(), 32);
    centerObject(latheMesh);
  };

  const gui = new GUI();
  gui.add(params, "easingFunction", Object.keys(Easing)).onChange(updateLatheGeometry);
  gui.add(params, "startRadius", 0, 2).onChange(updateLatheGeometry);
  gui.add(params, "endRadius", 0, 2).onChange(updateLatheGeometry);
  gui.add(params, "startHeight", 0, 5).onChange(updateLatheGeometry);
  gui.add(params, "endHeight", 0, 5).onChange(updateLatheGeometry);
  gui.add(params, "segments", 5, 50, 1).onChange(updateLatheGeometry);

  return () => {
    gui.destroy();
    latheMesh.geometry.dispose();
    material.dispose();
    dispose();
  };
}