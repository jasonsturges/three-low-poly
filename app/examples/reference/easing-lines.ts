import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from "three";
import { Easing } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { createTextSprite } from "../../framework/createTextSprite";

export const meta = { title: "Easing Lines" };

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container);
  camera.position.set(0, -10, 24);
  controls.target.set(0, -10, 0);
  controls.update();

  const easingFunctions = Object.entries(Easing);
  const gridCols = 5;
  const gridSpacing = 5;

  for (let i = 0; i < easingFunctions.length; i++) {
    const [name, easingFunction] = easingFunctions[i];
    const points: Vector3[] = [];
    const segments = 100;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      points.push(new Vector3(t * 2 - 1, easingFunction(t) * 2 - 1, 0));
    }

    const line = new Line(
      new BufferGeometry().setFromPoints(points),
      new LineBasicMaterial({ color: 0xff0000 }),
    );
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    line.position.x = col * gridSpacing - (gridCols - 1) * gridSpacing * 0.5;
    line.position.y = -row * gridSpacing + gridSpacing * 0.5;
    scene.add(line);
    scene.add(
      createTextSprite(name, {
        size: 24,
        x: line.position.x,
        y: line.position.y - 2,
        z: 0,
      }),
    );
  }

  return () => {
    scene.traverse((object) => {
      if (object instanceof Line) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    dispose();
  };
}