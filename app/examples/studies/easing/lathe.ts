import {
  BufferGeometry,
  Curve,
  DoubleSide,
  DirectionalLight,
  HemisphereLight,
  LatheGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Sprite,
  Vector2,
  Vector3,
} from "three";
import { Easing } from "three-low-poly";
import { clearDefaultLights } from "../../../framework/clearDefaultLights";
import { createScene } from "../../../framework/createScene";
import { createTextSprite } from "../../../framework/createTextSprite";

export const meta = {
  title: "Lathe",
  description:
    "Each easing function becomes a radial profile: radius = easing(t) × 1.5, height = t × 4. The cyan profile at left is revolved around the vertical axis to produce the surface at right. Both use the same 101 samples; gray guides mark the profile bounds and axis.",
};

class EasingCurve extends Curve<Vector2> {
  constructor(private easingFunction: (t: number) => number) {
    super();
  }

  override getPoint(t: number, optionalTarget = new Vector2()) {
    return optionalTarget.set(this.easingFunction(t) * 1.5, t * 4);
  }
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container);
  camera.position.set(0, -14.8, 35);
  controls.target.set(0, -14.8, 0);
  controls.update();
  clearDefaultLights(scene);
  scene.add(new HemisphereLight(0xffffff, 0x66554b, 1.4));
  const keyLight = new DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(-10, 0, 20);
  keyLight.target.position.set(0, -14.8, 0);
  scene.add(keyLight, keyLight.target);

  const latheMaterial = new MeshStandardMaterial({
    color: 0xc2452d,
    emissive: 0xc2452d,
    emissiveIntensity: 0.05,
    metalness: 0.5,
    roughness: 0.5,
    side: DoubleSide,
  });
  const profileMaterial = new LineBasicMaterial({ color: 0x72d9ed });
  const guideMaterial = new LineBasicMaterial({ color: 0x364454 });
  const guideGeometry = new BufferGeometry().setFromPoints([
    new Vector3(0, 0, 0),
    new Vector3(1.5, 0, 0),
    new Vector3(1.5, 4, 0),
    new Vector3(0, 4, 0),
    new Vector3(0, 0, 0),
  ]);
  const labels: Sprite[] = [];

  Object.entries(Easing).forEach(([name, easingFunction], index) => {
    const x = ((index % 5) - 2) * 8;
    const y = -Math.floor(index / 5) * 6.5;
    const points = new EasingCurve(easingFunction).getPoints(100);
    const lathe = new Mesh(new LatheGeometry(points, 32), latheMaterial);
    lathe.position.set(x + 1.1, y, 0);
    const profile = new Line(
      new BufferGeometry().setFromPoints(points.map((point) => new Vector3(point.x, point.y, 0))),
      profileMaterial,
    );
    profile.position.set(x - 3, y, 0);
    const guide = new Line(guideGeometry, guideMaterial);
    guide.position.set(x - 3, y, -0.01);
    const label = createTextSprite(name, { size: 64, scale: 1.1, x, y: y - 1 });
    labels.push(label);
    scene.add(lathe, profile, guide, label);
  });

  return () => {
    labels.forEach((label) => {
      label.material.map?.dispose();
      label.material.dispose();
    });
    scene.traverse((object) => {
      if ((object instanceof Mesh || object instanceof Line) && object.geometry !== guideGeometry) object.geometry.dispose();
    });
    guideGeometry.dispose();
    guideMaterial.dispose();
    profileMaterial.dispose();
    latheMaterial.dispose();
    dispose();
  };
}
