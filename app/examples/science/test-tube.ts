import GUI from "lil-gui";
import { DoubleSide, Mesh, MeshPhysicalMaterial } from "three";
import { TestTubeGeometry } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Test Tube" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const parameters = {
    radiusTop: 0.2,
    radiusBottom: 0.2,
    height: 3,
    segments: 32,
  };

  const glass = new MeshPhysicalMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    metalness: 0.1,
    reflectivity: 0.8,
    transmission: 0.9,
    depthWrite: false,
    side: DoubleSide,
  });

  const testTube = new Mesh(
    new TestTubeGeometry(
      parameters.radiusTop,
      parameters.radiusBottom,
      parameters.height,
      parameters.segments,
    ),
    glass,
  );
  scene.add(testTube);

  const rebuild = () => {
    testTube.geometry.dispose();
    testTube.geometry = new TestTubeGeometry(
      parameters.radiusTop,
      parameters.radiusBottom,
      parameters.height,
      parameters.segments,
    );
    scene.add(testTube);
  };

  const gui = new GUI();
  gui.add(parameters, "radiusTop", 0.05, 0.5).onChange(rebuild);
  gui.add(parameters, "radiusBottom", 0.05, 0.5).onChange(rebuild);
  gui.add(parameters, "height", 0.2, 3.0).onChange(rebuild);
  gui.add(parameters, "segments", 3, 32).step(1).onChange(rebuild);

  return () => {
    gui.destroy();
    testTube.geometry.dispose();
    glass.dispose();
    dispose();
  };
}