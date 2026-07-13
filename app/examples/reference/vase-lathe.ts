import GUI from "lil-gui";
import {
  AxesHelper,
  BufferGeometry,
  DoubleSide,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SplineCurve,
  Vector2,
} from "three";
import { createOrthographicScene } from "../../framework/createOrthographicScene";

export const meta = {
  title: "Vase (lathe prototype)",
  description: "TEMPORARY — a pot's silhouette is AUTHORED from control points, not computed from a function.",
};

/**
 * A vase is NOT a sweep — it is a LATHE. Revolve a silhouette around an axis rather than carry a
 * cross-section along a path. Different operation; that is why it has been a separate struggle.
 *
 * And here is the thing that has been breaking it:
 *
 *   A POT'S SILHOUETTE IS NOT A MATHEMATICAL FUNCTION.
 *
 * You cannot get *swelling at the foot, pinched at the waist, flaring at the lip* out of a parabola,
 * a sine, or an easing curve. Those are single-inflection shapes. A pot has three or four. Reaching
 * for a formula is the mistake — no formula has the shape in it.
 *
 * What a pot's profile actually is: **a handful of control points with a spline through them.** Which
 * is exactly what the Utah teapot is — a few hundred hand-placed control points and a Bézier
 * evaluator. You do not COMPUTE a pot's curve. You AUTHOR it, and then you tessellate it.
 *
 * Small data + a generating function. The teapot's lesson, applied to your own glassware.
 *
 * So: five radii up the height are the control points. Drag them and the bulge moves. That is the
 * whole model — and it can make a bulbous-bottomed jug, a shouldered vase, or an hourglass, because
 * it is not committed to any one curve family.
 */
interface VaseOptions {
  /** Radius at the foot. */
  r0: number;
  /** Radius one quarter up. Raise it for a bulbous bottom. */
  r1: number;
  /** Radius at the waist. Pinch it for an hourglass. */
  r2: number;
  /** Radius at the shoulder. Raise it for a bulbous top. */
  r3: number;
  /** Radius at the lip. Flare or neck it. */
  r4: number;
  height: number;
  /** How finely the silhouette curve is sampled — the smoothness of the profile. */
  profileSegments: number;
  /** How many times it is revolved — the low-poly knob. `6` gives a hexagonal pot. */
  radialSegments: number;
}

function buildVase({
  r0,
  r1,
  r2,
  r3,
  r4,
  height,
  profileSegments,
  radialSegments,
}: VaseOptions): BufferGeometry {
  // The five control points ARE the design. A spline threads them; nothing else decides the shape.
  const control = [
    new Vector2(r0, 0),
    new Vector2(r1, height * 0.25),
    new Vector2(r2, height * 0.5),
    new Vector2(r3, height * 0.75),
    new Vector2(r4, height),
  ];

  // Catmull-Rom through the control points — it passes THROUGH them, which is what makes them
  // feel like handles you are dragging rather than weights you are nudging.
  const silhouette = new SplineCurve(control).getPoints(profileSegments);

  // A flat foot: run in from the axis to the base radius before the curve begins. Without it the
  // pot is an open shell and you can see straight up inside it.
  const profile = [new Vector2(0.001, 0), new Vector2(r0, 0), ...silhouette];

  return new LatheGeometry(profile, radialSegments);
}

export default function (container: HTMLElement) {
  const { scene, dispose } = createOrthographicScene(container, { frustumSize: 3 });

  const params: VaseOptions = {
    r0: 0.55,
    r1: 0.95,
    r2: 0.8,
    r3: 0.5,
    r4: 0.62,
    height: 2.4,
    profileSegments: 40,
    radialSegments: 32,
  };

  const material = new MeshStandardMaterial({
    color: "#7fa8b8",
    roughness: 0.35,
    metalness: 0.05,
    side: DoubleSide,
    flatShading: true,
  });

  let vase = new Mesh(buildVase(params), material);
  scene.add(vase);
  scene.add(new AxesHelper(1.5));

  const rebuild = () => {
    vase.geometry.dispose();
    scene.remove(vase);
    vase = new Mesh(buildVase(params), material);
    scene.add(vase);
  };

  const gui = new GUI();

  // THESE FIVE SLIDERS ARE THE VASE. Drag r1 up for a bulbous bottom; drag r3 up instead and the
  // bulge climbs to the shoulder. Pinch r2 for an hourglass. No formula could do all three.
  const shape = gui.addFolder("Silhouette (the control points)");
  shape.add(params, "r0", 0.05, 1.5, 0.01).name("Foot").onChange(rebuild);
  shape.add(params, "r1", 0.05, 1.5, 0.01).name("Lower Belly").onChange(rebuild);
  shape.add(params, "r2", 0.05, 1.5, 0.01).name("Waist").onChange(rebuild);
  shape.add(params, "r3", 0.05, 1.5, 0.01).name("Shoulder").onChange(rebuild);
  shape.add(params, "r4", 0.05, 1.5, 0.01).name("Lip").onChange(rebuild);
  shape.open();

  gui.add(params, "height", 0.5, 5, 0.1).name("Height").onChange(rebuild);
  gui.add(params, "profileSegments", 4, 120, 1).name("Profile Segments").onChange(rebuild);
  // Drop to 6 and it becomes a faceted, hand-thrown-looking pot. The low-poly knob, on a lathe.
  gui.add(params, "radialSegments", 3, 64, 1).name("Radial Segments").onChange(rebuild);

  return () => {
    gui.destroy();
    vase.geometry.dispose();
    material.dispose();
    dispose();
  };
}
