import GUI from "lil-gui";
import { Color, Group, Mesh, MeshStandardMaterial } from "three";
import { BevelGearGeometry } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";

export const meta = {
  title: "Bevel Gear Pair",
  description:
    "STUDY — two bevel wheels on intersecting shafts, and the law that sets their cone angles. Bevel teeth " +
    "are cut on a PITCH CONE, and a pair meshes when the two cones share an APEX — which makes the shaft " +
    "angle the SUM of the two cone angles, not a free choice for either. So neither angle is dialled here: " +
    "set the shaft angle and the two tooth counts, and both cones are solved. Equal counts at 90° give 45° " +
    "and 45°, the MITER pair. Push the ratio and the angles split apart — the fast wheel narrows toward a " +
    "spike and the slow one opens toward a plate. Everything else is the spur pair's law unchanged: equal " +
    "MODULE at the back face, ratio from tooth counts. NOTE what this is NOT: a flat spur pinion on a crown " +
    "wheel is a different mechanism, because a real spur pinion is a CYLINDER and its mate's teeth must be " +
    "cut as the envelope of that cylinder's motion — a face-gear form this construction cannot make.",
};

/** Standard tooth proportions, in multiples of the module. The extra `0.25` is root clearance. */
const ADDENDUM = 1;
const DEDENDUM = 1.25;
/** Backlash as a fraction of one period. */
const BACKLASH = 0.06;
/** Apex-to-back-face distance along the pitch cone. Shared by both wheels — that is what makes them a pair. */
const CONE_DISTANCE = 1.15;
/** Tooth length along the cone element, as a fraction of the cone distance. */
const FACE_FRACTION = 0.3;

const TOOTH = { tipWidth: 0.25, valleyWidth: 0.25 };

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [2.4, 1.6, 2.4] });
  const { scene, onFrame, dispose } = handle;

  const params = { shaftAngle: 90, teethA: 20, teethB: 20, animate: true, speed: 0.5 };
  const colors = { a: "#b08d4f", b: "#8f97a1" };
  const stats = { coneA: "", coneB: "", module: "", ratio: "", apexCheck: "" };

  const brass = new MeshStandardMaterial({ color: new Color(colors.a), metalness: 0.85, roughness: 0.3, flatShading: true });
  const steel = new MeshStandardMaterial({ color: new Color(colors.b), metalness: 0.8, roughness: 0.35, flatShading: true });

  // Each wheel hangs in its own pivot, and every pivot's ORIGIN is the shared apex. The mesh is pushed back
  // down its own axis so its apex lands there, which turns "share an apex" into one translate per wheel.
  // Turned over so the wheel sits below and its mate rises out of it — a rigid half turn about X, so it flips
  // top for bottom while leaving left and right alone. Nothing below is aware of it.
  const train = new Group();
  train.rotation.x = Math.PI;
  const pivotA = new Group();
  const pivotB = new Group();
  const gearA = new Mesh(new BevelGearGeometry(), brass);
  const gearB = new Mesh(new BevelGearGeometry(), steel);
  gearA.castShadow = gearA.receiveShadow = true;
  gearB.castShadow = gearB.receiveShadow = true;
  pivotA.add(gearA);
  pivotB.add(gearB);
  train.add(pivotA, pivotB);
  scene.add(train);

  let phaseA = 0;
  let phaseB = 0;
  let spin = 0;

  const rebuild = () => {
    gearA.geometry.dispose();
    gearB.geometry.dispose();

    const shaft = (params.shaftAngle * Math.PI) / 180;

    // ---- the whole calculation ----
    // Sharing an apex forces the two cone angles to sum to the shaft angle. Combine that with equal module and
    // the split is fixed by the tooth counts alone:
    const coneA = Math.atan2(Math.sin(shaft), params.teethB / params.teethA + Math.cos(shaft));
    const coneB = shaft - coneA;

    // Both wheels are cut at the same distance from the apex, so their back-face pitch radii are just that
    // distance resolved onto each cone. Equal module falls out — no separate step.
    const pitchA = CONE_DISTANCE * Math.sin(coneA);
    const pitchB = CONE_DISTANCE * Math.sin(coneB);
    const module = (2 * pitchA) / params.teethA;

    const faceWidth = CONE_DISTANCE * FACE_FRACTION;
    const outerA = pitchA + ADDENDUM * module;
    const outerB = pitchB + ADDENDUM * module;

    // `pitchAngle` on the geometry is the TIP cone's half-angle, not the pitch cone's — it drives the apex
    // through the tip circle. Convert, or the two apexes miss each other by the addendum.
    const build = (teeth: number, pitch: number, outer: number, cone: number, thin: boolean) =>
      new BevelGearGeometry({
        teeth,
        pitchAngle: Math.atan2(outer, CONE_DISTANCE * Math.cos(cone)),
        faceWidth,
        outerRadius: outer,
        innerRadius: pitch - DEDENDUM * module,
        tipWidth: TOOTH.tipWidth - (thin ? BACKLASH : 0),
        valleyWidth: TOOTH.valleyWidth,
        holeRadius: pitch * 0.22,
        holeSides: 24,
      });

    gearA.geometry = build(params.teethA, pitchA, outerA, coneA, false);
    gearB.geometry = build(params.teethB, pitchB, outerB, coneB, true);

    // Push each wheel back along its own axis so its apex sits on the pivot origin. Both pivots share that
    // origin, so the apexes coincide by construction rather than by adjustment.
    gearA.position.z = -(gearA.geometry as BevelGearGeometry).apexZ;
    gearB.position.z = -(gearB.geometry as BevelGearGeometry).apexZ;

    // A's body runs down -Z from the apex. Tilting B's pivot by the shaft angle opens the two axes by exactly
    // that much, which is the mechanism the whole study is about.
    pivotA.rotation.x = 0;
    pivotB.rotation.x = shaft;

    // ---- phasing ----
    // Contact is where the two cones touch, which lies in the plane of the two axes. In A's own frame that
    // direction is +Y — where `GearShape` already rests a tooth, so A needs no offset at all.
    phaseA = 0;
    // The same line arrives in B's frame at -Y, and B must present a VALLEY there: half a turn to face the
    // other way, less the half period that separates a valley from a tooth.
    phaseB = Math.PI - Math.PI / params.teethB;

    gearA.rotation.z = phaseA;
    gearB.rotation.z = phaseB;
    spin = 0;

    stats.coneA = `${((coneA * 180) / Math.PI).toFixed(2)}°`;
    stats.coneB = `${((coneB * 180) / Math.PI).toFixed(2)}°`;
    stats.module = module.toFixed(4);
    stats.ratio = `${(params.teethA / params.teethB).toFixed(3)} : 1`;
    // Both should read the same — the apexes landing together is the mesh.
    stats.apexCheck = `${(CONE_DISTANCE * Math.cos(coneA)).toFixed(3)} / ${(CONE_DISTANCE * Math.cos(coneB)).toFixed(3)}`;

    frameObject(handle, train, { dolly: false });
  };

  rebuild();
  frameObject(handle, train, { fit: 1.3 });

  const stop = onFrame((delta) => {
    if (!params.animate) return;
    spin += delta * params.speed;
    // Same rule as every other pair: teeth pass the contact point at one rate, so turns go inversely with
    // tooth count. The cones change nothing about it.
    gearA.rotation.z = phaseA + spin;
    gearB.rotation.z = phaseB - (spin * params.teethA) / params.teethB;
  });

  const gui = new GUI();
  gui.title("Bevel Gear Pair");

  const drive = gui.addFolder("Drive");
  // The SUM of the two cone angles. Neither one is settable on its own.
  // Capped at 90. Beyond it the slower wheel's cone goes OBTUSE — an internal bevel, which a cone lofted
  // toward its own apex cannot be.
  drive.add(params, "shaftAngle", 40, 90, 1).name("Shaft Angle °").onChange(rebuild);
  drive.add(params, "teethA", 12, 40, 1).name("Wheel A Teeth").onChange(rebuild);
  drive.add(params, "teethB", 12, 40, 1).name("Wheel B Teeth").onChange(rebuild);
  drive.open();

  const motion = gui.addFolder("Motion");
  motion.add(params, "animate").name("Run");
  motion.add(params, "speed", 0.1, 3, 0.05).name("Speed");
  motion.open();

  const material = gui.addFolder("Material");
  material.addColor(colors, "a").name("Wheel A").onChange(() => brass.color.set(colors.a));
  material.addColor(colors, "b").name("Wheel B").onChange(() => steel.color.set(colors.b));

  const readout = gui.addFolder("Measured");
  // Solved, never set — and they always sum to the shaft angle.
  readout.add(stats, "coneA").name("Cone Angle A").listen().disable();
  readout.add(stats, "coneB").name("Cone Angle B").listen().disable();
  readout.add(stats, "module").name("Module").listen().disable();
  readout.add(stats, "ratio").name("Ratio").listen().disable();
  readout.add(stats, "apexCheck").name("Apex Z (A / B)").listen().disable();
  readout.open();

  return () => {
    stop();
    gui.destroy();
    gearA.geometry.dispose();
    gearB.geometry.dispose();
    brass.dispose();
    steel.dispose();
    dispose();
  };
}
