import GUI from "lil-gui";
import { Color, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { BevelGearGeometry, GearGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Bevel and Spur",
  description:
    "STUDY — a flat spur gear run against an upward-facing bevel, and why it CANNOT be right. The contact " +
    "line lies on the cone, so it passes through the apex; it lies on the cylinder, so it is parallel to the " +
    "spur's axis. Along that line the bevel's surface speed is `ω × d × sin γ`, GROWING with distance from " +
    "the apex, while the spur's is `ω × r`, CONSTANT. Two such speeds are equal at exactly one point, so a " +
    "spur rolls truly at ONE radius and slides everywhere else — the tooth pitch diverges along the face for " +
    "the same reason. Widen Spur Thickness and watch the teeth foul at both ends while staying correct in " +
    "the middle. That is the whole argument for a FACE GEAR, whose teeth are cut as the envelope of the " +
    "spur's motion rather than as a copy of its profile, and it is why this library cannot build this pair " +
    "honestly. The shaft angle here is the bevel's cone angle ALONE, because a flat gear contributes zero.",
};

const ADDENDUM = 1;
const DEDENDUM = 1.25;
const BACKLASH = 0.06;
/** Apex-to-contact distance along the cone. The one radius at which the pair actually rolls. */
const CONE_DISTANCE = 1.2;
/** Bevel tooth length along the cone element, as a fraction of the cone distance. */
const FACE_FRACTION = 0.34;

const TOOTH = { tipWidth: 0.25, valleyWidth: 0.25 };

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [2.6, 1.9, 2.6] });
  const { scene, onFrame, dispose } = handle;

  const params = { coneAngle: 55, bevelTeeth: 28, spurTeeth: 12, spurThickness: 0.12, animate: true, speed: 0.5 };
  const colors = { bevel: "#8f97a1", spur: "#b08d4f" };
  const stats = { shaftAngle: "", module: "", spurRadius: "", ratio: "", slip: "" };

  const steel = new MeshStandardMaterial({ color: new Color(colors.bevel), metalness: 0.8, roughness: 0.35, flatShading: true });
  const brass = new MeshStandardMaterial({ color: new Color(colors.spur), metalness: 0.85, roughness: 0.3, flatShading: true });

  const train = new Group();
  // The bevel's pivot origin IS its apex, and it faces up: local +Z becomes world +Y.
  const bevelPivot = new Group();
  bevelPivot.rotation.x = -Math.PI / 2;
  const spurPivot = new Group();
  const bevel = new Mesh(new BevelGearGeometry(), steel);
  const spur = new Mesh(new GearGeometry(), brass);
  bevel.castShadow = bevel.receiveShadow = true;
  spur.castShadow = spur.receiveShadow = true;
  bevelPivot.add(bevel);
  spurPivot.add(spur);
  train.add(bevelPivot, spurPivot);
  scene.add(train);

  let phaseBevel = 0;
  let phaseSpur = 0;
  let spin = 0;

  const rebuild = () => {
    bevel.geometry.dispose();
    spur.geometry.dispose();

    const gamma = (params.coneAngle * Math.PI) / 180;

    // ---- the whole calculation ----
    // A flat gear's pitch surface is a CYLINDER — a cone with its apex at infinity — so it contributes
    // nothing to the shaft angle, and the bevel's cone angle IS the angle between the shafts.
    const shaftAngle = gamma;

    const faceWidth = CONE_DISTANCE * FACE_FRACTION;
    // The bevel's teeth run from its BACK face inward toward the apex, so the back face has to sit half a
    // face beyond the contact — otherwise the spur rides the outermost rim with half its width hanging off.
    const backDistance = CONE_DISTANCE + faceWidth / 2;

    // Everything about a bevel tooth scales with distance from the apex, so a module is only meaningful at a
    // stated radius. Match at the CONTACT; the back face is then bigger in the same proportion.
    const module = (2 * (CONE_DISTANCE * Math.sin(gamma))) / params.bevelTeeth;
    const backModule = (module * backDistance) / CONE_DISTANCE;
    const backPitch = backDistance * Math.sin(gamma);
    const bevelOuter = backPitch + ADDENDUM * backModule;

    // Equal module AT THE CONTACT, exactly as every other pair in this set.
    const spurRadius = (module * params.spurTeeth) / 2;

    bevel.geometry = new BevelGearGeometry({
      teeth: params.bevelTeeth,
      // The parameter is the TIP cone's half-angle, so convert from the pitch cone's.
      pitchAngle: Math.atan2(bevelOuter, backDistance * Math.cos(gamma)),
      faceWidth,
      outerRadius: bevelOuter,
      innerRadius: backPitch - DEDENDUM * backModule,
      tipWidth: TOOTH.tipWidth,
      valleyWidth: TOOTH.valleyWidth,
      holeRadius: backPitch * 0.2,
      holeSides: 24,
    });

    spur.geometry = new GearGeometry({
      teeth: params.spurTeeth,
      outerRadius: spurRadius + ADDENDUM * module,
      innerRadius: spurRadius - DEDENDUM * module,
      tipWidth: TOOTH.tipWidth - BACKLASH,
      valleyWidth: TOOTH.valleyWidth,
      holeRadius: spurRadius * 0.28,
      holeSides: 24,
      // Held to the bevel's face — wider and the spur simply overhangs the teeth, which is a separate defect
      // from the one this study is about.
      depth: Math.min(params.spurThickness, faceWidth),
    });

    bevel.position.z = -(bevel.geometry as BevelGearGeometry).apexZ;

    // ---- placing the spur ----
    // The bevel's apex is the world origin and its axis is +Y, so its cone elements run down and out. Contact
    // sits on the element at +X, half a face inside the back edge.
    const element = new Vector3(Math.sin(gamma), -Math.cos(gamma), 0);
    const contact = element.clone().multiplyScalar(CONE_DISTANCE);
    // Surface normal, perpendicular to the element and away from the axis — the spur sits on TOP of the cone
    // face by its own radius. Flip this and it would ride underneath, inside the metal.
    const normal = new Vector3(Math.cos(gamma), Math.sin(gamma), 0);
    spurPivot.position.copy(contact).addScaledVector(normal, spurRadius);

    // Build the spur's frame explicitly rather than letting `setFromUnitVectors` choose a roll for us: its
    // local +Z must be the element (that is what makes the contact line common to both surfaces), and its
    // local +Y must point AT the contact, since `GearShape` rests a tooth on +Y. Then phase 0 is a tooth in
    // the right place, with nothing left to guess.
    const zAxis = element.clone();
    const yAxis = normal.clone().negate();
    const xAxis = new Vector3().crossVectors(yAxis, zAxis);
    spurPivot.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(xAxis, yAxis, zAxis));

    // ---- phasing ----
    // The contact azimuth is the bevel's own local +X, and it must present a VALLEY there — half a period
    // past the tooth that rests on +Y, then a quarter turn back.
    phaseBevel = -Math.PI / 2 - Math.PI / params.bevelTeeth;
    // Nothing to correct: the basis above already aimed a tooth at the contact.
    phaseSpur = 0;
    bevel.rotation.z = phaseBevel;
    spur.rotation.z = phaseSpur;
    spin = 0;

    stats.shaftAngle = `${params.coneAngle.toFixed(0)}°`;
    stats.module = module.toFixed(4);
    stats.spurRadius = spurRadius.toFixed(4);
    stats.ratio = `${(params.bevelTeeth / params.spurTeeth).toFixed(3)} : 1`;
    // Speeds match only at the contact. At the edges of the spur the mismatch is the whole defect, and it
    // depends on nothing but how much of the cone the spur spans — not on the angle, the ratio, or the module.
    stats.slip = `±${((Math.min(params.spurThickness, faceWidth) / 2 / CONE_DISTANCE) * 100).toFixed(1)}%`;

  };

  rebuild();
  frameObject(handle, train, { fit: 1.3 });

  const stop = onFrame((delta) => {
    if (!params.animate) return;
    spin += delta * params.speed;
    // SAME sign, unlike every other pair here. Matching the surface velocities at the contact point gives
    // `R_bevel * w_bevel = r_spur * w_spur` with no reversal, because the spur's axis already points down and
    // out — better than a right angle away from the bevel's. The axes carry the reversal, not the rates.
    // Negate one and the two wheels drive INTO each other.
    bevel.rotation.z = phaseBevel + spin;
    spur.rotation.z = phaseSpur + (spin * params.bevelTeeth) / params.spurTeeth;
  });

  const gui = new GUI();
  gui.title("Bevel and Spur");

  const drive = gui.addFolder("Drive");
  // With a flat mate this IS the shaft angle — 45 gives a 45° drive, not 90°.
  drive.add(params, "coneAngle", 20, 80, 1).name("Cone Angle °").onChange(rebuild);
  drive.add(params, "bevelTeeth", 16, 48, 1).name("Bevel Teeth").onChange(rebuild);
  drive.add(params, "spurTeeth", 8, 24, 1).name("Spur Teeth").onChange(rebuild);
  drive.open();

  const defect = gui.addFolder("The Defect");
  // Thin engages only near the contact point and looks right. Widen it and the ends foul.
  defect.add(params, "spurThickness", 0.03, 0.6, 0.01).name("Spur Thickness").onChange(rebuild);
  defect.open();

  const motion = gui.addFolder("Motion");
  motion.add(params, "animate").name("Run");
  motion.add(params, "speed", 0.1, 3, 0.05).name("Speed");
  motion.open();

  const material = gui.addFolder("Material");
  material.addColor(colors, "bevel").name("Bevel").onChange(() => steel.color.set(colors.bevel));
  material.addColor(colors, "spur").name("Spur").onChange(() => brass.color.set(colors.spur));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "shaftAngle").name("Shaft Angle").listen().disable();
  readout.add(stats, "module").name("Module").listen().disable();
  readout.add(stats, "spurRadius").name("Spur Pitch Radius").listen().disable();
  readout.add(stats, "ratio").name("Ratio").listen().disable();
  // The finding. Zero only if the teeth spanned no width at all.
  readout.add(stats, "slip").name("Slip at face ends").listen().disable();
  readout.open();

  return () => {
    stop();
    gui.destroy();
    bevel.geometry.dispose();
    spur.geometry.dispose();
    steel.dispose();
    brass.dispose();
    dispose();
  };
}
