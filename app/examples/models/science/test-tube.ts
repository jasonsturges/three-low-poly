import GUI from "lil-gui";
import { TestTube, TestTubeGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Test Tube" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const parameters = {
    radiusTop: 0.2,
    radiusBottom: 0.2,
    height: 3,
    segments: 32,
  };

  const testTube = new TestTube(parameters.radiusTop, parameters.radiusBottom, parameters.height, parameters.segments);
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
    dispose();
  };
}