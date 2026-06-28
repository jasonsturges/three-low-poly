import { Curve, DoubleSide, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from "three";
import { Easing } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { createTextSprite } from "../../framework/createTextSprite";

export const meta = { title: "Easing Lathe (Curves)" };

class EasingCurve extends Curve<Vector2> {
  constructor(
    private easingFunction: (t: number) => number,
    private height = 10,
    private scale = 5,
  ) {
    super();
  }

  override getPoint(t: number, optionalTarget = new Vector2()) {
    return optionalTarget.set(this.easingFunction(t) * this.scale, t * this.height);
  }
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container);
  camera.position.set(0, -36, 70);
  controls.target.set(0, -36, 0);
  controls.update();

  const easingFunctions = Object.entries(Easing);
  const gridCols = 5;
  const gridSpacing = 15;
  const latheMaterial = new MeshStandardMaterial({
    color: 0xc2452d,
    emissive: 0xc2452d,
    emissiveIntensity: 0.05,
    metalness: 0.5,
    roughness: 0.5,
    side: DoubleSide,
  });

  for (let i = 0; i < easingFunctions.length; i++) {
    const [name, easingFunction] = easingFunctions[i];
    const curve = new EasingCurve(easingFunction);
    const points = curve.getPoints(100);
    const latheMesh = new Mesh(new LatheGeometry(points, 32), latheMaterial);
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    latheMesh.position.x = col * gridSpacing - (gridCols - 1) * gridSpacing * 0.5;
    latheMesh.position.y = -row * gridSpacing - gridSpacing * 0.5;
    scene.add(latheMesh);
    scene.add(
      createTextSprite(name, {
        size: 80,
        x: latheMesh.position.x,
        y: latheMesh.position.y - 1,
        z: 0,
      }),
    );
  }

  return () => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
      }
    });
    latheMaterial.dispose();
    dispose();
  };
}