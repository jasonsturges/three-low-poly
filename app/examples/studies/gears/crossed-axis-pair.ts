import GUI from "lil-gui";
import { Color, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { CrossedWheelGeometry, GearGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Crossed Axis Pair",
  description:
    "STUDY — a pinion meeting a horizontal clock wheel at an angle, and the fact that WHICH LINE you tilt " +
    "it about is the whole mechanism. Hinge it up out of the wheel's plane, folding paper about the TANGENT, " +
    "and the two axes INTERSECT: the surface velocities come out collinear and equal, so the pitch point " +
    "rolls with no sliding at any angle. Tip it sideways about the LINE OF CENTERS instead and the axes stay " +
    "SKEW — never meeting, always `r₁ + r₂` apart — and the same two velocities, still equal in magnitude, " +
    "now differ in DIRECTION by the crossing angle. Their difference is the chord across it, so the teeth " +
    "scrub at `2 × sin(Σ/2)` of pitch-line speed: 43% at 25°, 100% at 60°, and not recoverable by any ratio. " +
    "Same two gears, same angle, two different machines. Neither is fully honest with straight teeth — the " +
    "intersecting one rolls at the point but its flanks still foul away from it, which is why real drives at " +
    "an angle are cut HELICAL or coned.",
};

const ADDENDUM = 1;
const DEDENDUM = 1.25;
const BACKLASH = 0.06;

const TOOTH = { tipWidth: 0.25, valleyWidth: 0.25 };

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [1.9, 1.5, 2.4] });
  const { scene, onFrame, dispose } = handle;

  const params = {
    tilt: "tangent (axes meet)" as "tangent (axes meet)" | "line of centers (skew)",
    crossAngle: 25,
    module: 0.05,
    wheelTeeth: 56,
    pinionTeeth: 10,
    animate: true,
    speed: 0.4,
  };
  const colors = { wheel: "#a8935e", pinion: "#c9a227" };
  const stats = { wheelRadius: "", pinionRadius: "", centerDistance: "", ratio: "", slide: "" };

  const brass = new MeshStandardMaterial({ color: new Color(colors.wheel), metalness: 0.85, roughness: 0.32, flatShading: true });
  const gilt = new MeshStandardMaterial({ color: new Color(colors.pinion), metalness: 0.9, roughness: 0.26, flatShading: true });

  // Laid over so the great wheel runs horizontal, the way it sits in a movement.
  const train = new Group();
  train.rotation.x = -Math.PI / 2;
  const pinionPivot = new Group();
  const wheel = new Mesh(new CrossedWheelGeometry(), brass);
  const pinion = new Mesh(new GearGeometry(), gilt);
  wheel.castShadow = wheel.receiveShadow = true;
  pinion.castShadow = pinion.receiveShadow = true;
  pinionPivot.add(pinion);
  train.add(wheel, pinionPivot);
  scene.add(train);

  let phaseWheel = 0;
  let phasePinion = 0;
  let spin = 0;

  const rebuild = () => {
    wheel.geometry.dispose();
    pinion.geometry.dispose();

    const sigma = (params.crossAngle * Math.PI) / 180;

    // ---- the whole calculation ----
    // Equal module, exactly as the parallel and intersecting cases. Skewing the axes changes where the wheels
    // GO, never how their teeth are sized.
    const wheelRadius = (params.module * params.wheelTeeth) / 2;
    const pinionRadius = (params.module * params.pinionTeeth) / 2;
    // Two skew lines have exactly one common perpendicular, and the pitch cylinders touch on it — so the
    // center distance is the plain sum, with no apex to reconcile and no cone angle to convert.
    const centerDistance = wheelRadius + pinionRadius;

    wheel.geometry = new CrossedWheelGeometry({
      teeth: params.wheelTeeth,
      outerRadius: wheelRadius + ADDENDUM * params.module,
      innerRadius: wheelRadius - DEDENDUM * params.module,
      tipWidth: TOOTH.tipWidth,
      valleyWidth: TOOTH.valleyWidth,
      crossings: 5,
      crossingWidth: 0.05,
      hubRadius: wheelRadius * 0.16,
      rimWidth: params.module * 2,
      holeRadius: wheelRadius * 0.07,
      holeSides: 24,
      depth: 0.05,
    });

    pinion.geometry = new GearGeometry({
      teeth: params.pinionTeeth,
      outerRadius: pinionRadius + ADDENDUM * params.module,
      innerRadius: pinionRadius - DEDENDUM * params.module,
      tipWidth: TOOTH.tipWidth - BACKLASH,
      valleyWidth: TOOTH.valleyWidth,
      holeRadius: pinionRadius * 0.3,
      holeSides: 20,
      depth: 0.09,
    });

    // ---- placing the pinion ----
    // The wheel's axis is +Z, so contact sits at (wheelRadius, 0, 0). WHICH LINE the pinion is tilted about
    // decides everything, and the two choices are not variations of one arrangement:
    //
    //   tangent        — hinge the pinion up out of the wheel's plane, like folding paper. The two axes then
    //                    INTERSECT, and the pitch cylinders roll on each other with no sliding at all.
    //   line of centers — tip the pinion sideways about the line joining the centers. The axes stay SKEW,
    //                    never meeting, and the teeth scrub past each other forever.
    const skew = params.tilt === "line of centers (skew)";
    // Hinging the fold the other way is just the negative angle — it lifts the pinion above the wheel's plane
    // instead of dropping it below, and every quantity below is even or odd in step, so nothing else moves.
    const fold = -sigma;
    const axis = skew
      ? new Vector3(0, Math.sin(sigma), Math.cos(sigma))
      : new Vector3(Math.sin(fold), 0, Math.cos(fold));

    // Folding about the tangent swings the pinion's center along an arc around the contact; tipping about the
    // line of centers leaves it where it was.
    if (skew) pinionPivot.position.set(centerDistance, 0, 0);
    else pinionPivot.position.set(wheelRadius + pinionRadius * Math.cos(fold), 0, -pinionRadius * Math.sin(fold));

    // Explicit basis again: local +Z on the pinion's own axis, local +Y aimed back at the contact, so
    // `GearShape`'s resting tooth lands where it is needed instead of wherever a shortest-arc rotation puts it.
    const yAxis = skew ? new Vector3(-1, 0, 0) : new Vector3(-Math.cos(fold), 0, Math.sin(fold));
    const xAxis = new Vector3().crossVectors(yAxis, axis);
    pinionPivot.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(xAxis, yAxis, axis));

    // ---- phasing ----
    // The wheel presents a TOOTH at +X, the pinion a VALLEY facing back at it — the parallel case unchanged,
    // because skewing the axes does not move the contact off the common perpendicular.
    phaseWheel = -Math.PI / 2;
    phasePinion = -Math.PI / params.pinionTeeth;
    wheel.rotation.z = phaseWheel;
    pinion.rotation.z = phasePinion;
    spin = 0;

    stats.wheelRadius = wheelRadius.toFixed(4);
    stats.pinionRadius = pinionRadius.toFixed(4);
    stats.centerDistance = centerDistance.toFixed(4);
    stats.ratio = `${(params.wheelTeeth / params.pinionTeeth).toFixed(3)} : 1`;
    // Skew: both surface velocities have the SAME magnitude and differ only in direction, by the crossing
    // angle — so their difference is the chord across it, and depends on nothing else. Intersecting: the two
    // velocities come out collinear and equal, so the pitch point rolls cleanly at any angle.
    stats.slide = skew ? `${(2 * Math.sin(sigma / 2) * 100).toFixed(1)}%` : "0.0% (rolls)";

    frameObject(handle, train, { dolly: false });
  };

  rebuild();
  frameObject(handle, train, { fit: 1.25 });

  const stop = onFrame((delta) => {
    if (!params.animate) return;
    spin += delta * params.speed;
    // Teeth still pass the contact at one rate, so the ratio is still the tooth counts and nothing else. What
    // the crossing angle costs is not speed but sliding — the readout, not the rate.
    wheel.rotation.z = phaseWheel + spin;
    pinion.rotation.z = phasePinion - (spin * params.wheelTeeth) / params.pinionTeeth;
  });

  const gui = new GUI();
  gui.title("Crossed Axis Pair");

  const drive = gui.addFolder("Drive");
  // THE choice. Same two gears, same angle, two different mechanisms.
  drive.add(params, "tilt", ["tangent (axes meet)", "line of centers (skew)"]).name("Tilt About").onChange(rebuild);
  // 0 is an ordinary spur pair either way. Every degree off it separates them.
  drive.add(params, "crossAngle", 0, 60, 1).name("Crossing Angle °").onChange(rebuild);
  drive.add(params, "module", 0.03, 0.09, 0.005).name("Module (tooth size)").onChange(rebuild);
  drive.add(params, "wheelTeeth", 36, 80, 1).name("Wheel Teeth").onChange(rebuild);
  drive.add(params, "pinionTeeth", 8, 20, 1).name("Pinion Teeth").onChange(rebuild);
  drive.open();

  const motion = gui.addFolder("Motion");
  motion.add(params, "animate").name("Run");
  motion.add(params, "speed", 0.1, 3, 0.05).name("Speed");
  motion.open();

  const material = gui.addFolder("Material");
  material.addColor(colors, "wheel").name("Wheel").onChange(() => brass.color.set(colors.wheel));
  material.addColor(colors, "pinion").name("Pinion").onChange(() => gilt.color.set(colors.pinion));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "wheelRadius").name("Wheel Pitch Radius").listen().disable();
  readout.add(stats, "pinionRadius").name("Pinion Pitch Radius").listen().disable();
  readout.add(stats, "centerDistance").name("Center Distance").listen().disable();
  readout.add(stats, "ratio").name("Ratio").listen().disable();
  // The finding: 2 x sin(angle / 2), as a fraction of pitch-line speed. Zero only at zero.
  readout.add(stats, "slide").name("Tooth Scrub").listen().disable();
  readout.open();

  return () => {
    stop();
    gui.destroy();
    wheel.geometry.dispose();
    pinion.geometry.dispose();
    brass.dispose();
    gilt.dispose();
    dispose();
  };
}
