import { BufferGeometry, Line, LineBasicMaterial, Vector3, Sprite } from "three";
import { Easing } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { createTextSprite } from "../../../framework/createTextSprite";

export const meta = {
  title: "Lines",
  description:
    "Package easing functions plotted over t = 0…1. Each square spans 0…1 on both axes; the diagonal is linear. Inverse and Gaussian are useful shaping functions, rather than conventional start-to-end timing curves.",
};

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container);
  camera.position.set(0, -10.4, 23);
  controls.target.set(0, -10.4, 0);
  controls.update();

  const easingFunctions = Object.entries(Easing);
  const gridCols = 5;
  const gridSpacing = 5;

  const guideGeometry = new BufferGeometry().setFromPoints([
    new Vector3(-1, -1, 0),
    new Vector3(1, -1, 0),
    new Vector3(1, 1, 0),
    new Vector3(-1, 1, 0),
    new Vector3(-1, -1, 0),
    new Vector3(1, 1, 0),
  ]);
  const guideMaterial = new LineBasicMaterial({ color: 0x364454 });
  const labels: Sprite[] = [];

  for (let i = 0; i < easingFunctions.length; i++) {
    const [name, easingFunction] = easingFunctions[i];
    const points: Vector3[] = [];
    const segments = 100;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      points.push(new Vector3(t * 2 - 1, easingFunction(t) * 2 - 1, 0));
    }

    const line = new Line(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ color: 0x72d9ed }));
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    line.position.x = col * gridSpacing - (gridCols - 1) * gridSpacing * 0.5;
    line.position.y = -row * gridSpacing + gridSpacing * 0.5;
    const guide = new Line(guideGeometry, guideMaterial);
    guide.position.copy(line.position);
    guide.position.z = -0.01;
    scene.add(guide, line);
    const label = createTextSprite(name, { size: 64, scale: 0.8, x: line.position.x, y: line.position.y - 1.8 });
    labels.push(label);
    scene.add(label);
  }

  return () => {
    labels.forEach((label) => {
      label.material.map?.dispose();
      label.material.dispose();
    });
    scene.traverse((object) => {
      if (object instanceof Line && object.geometry !== guideGeometry) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    guideGeometry.dispose();
    guideMaterial.dispose();
    dispose();
  };
}
