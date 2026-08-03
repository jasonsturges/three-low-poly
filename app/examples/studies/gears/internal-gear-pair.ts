import GUI from "lil-gui";
import { Color, Group, Mesh, MeshStandardMaterial } from "three";
import { GearGeometry, InternalGearGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Internal Gear Pair",
  description:
    "STUDY — a spur pinion running inside a ring, and the two signs that flip. An internal pair obeys the " +
    "same law as an external one: equal MODULE, `2 × pitchRadius / teeth`. But because the ring's teeth face " +
    "inward, the center distance is the DIFFERENCE of the pitch radii rather than the sum, and the two " +
    "wheels turn the SAME direction rather than opposing. Those two sign changes are the whole difference " +
    "between this and the Spur Gear Pair — the phasing does NOT flip with them: the pinion still puts a TOOTH " +
    "where the ring puts a VALLEY, exactly as an external pair does. Drive the tooth counts together and " +
    "watch the pinion climb toward the rim; at equal counts the center distance goes to zero and there is no " +
    "pair left. Long before that it BINDS, which is real — an internal pair needs a minimum difference in " +
    "tooth count or the tips foul, and the pinion count is held fourteen below the ring's here, which is what these straight-flanked teeth need. Involute teeth manage on about ten.",
};

/**
 * Standard tooth proportions, both **multiples of the module** — how far the tip stands above the pitch circle
 * and how far the valley falls below it. The extra `0.25` is root clearance.
 */
const ADDENDUM = 1;
const DEDENDUM = 1.25;
/** Backlash as a fraction of one period. */
const BACKLASH = 0.06;
/** Fewest teeth by which the ring must exceed the pinion before the tips foul. */
const MIN_DIFFERENCE = 14;

const TOOTH = { tipWidth: 0.25, valleyWidth: 0.25, depth: 0.22 };
/** Material outboard of the ring's valleys — the rim the teeth hang from. */
const RIM_THICKNESS = 0.12;

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [0, 0.5, 3.8] });
  const { scene, onFrame, dispose } = handle;

  const params = { module: 0.075, ringTeeth: 34, pinionTeeth: 13, animate: true, speed: 0.4 };
  const colors = { ring: "#8f97a1", pinion: "#b08d4f" };
  const stats = { ringRadius: "", pinionRadius: "", centeredistance: "", ratio: "" };

  const steel = new MeshStandardMaterial({ color: new Color(colors.ring), metalness: 0.8, roughness: 0.35, flatShading: true });
  const brass = new MeshStandardMaterial({ color: new Color(colors.pinion), metalness: 0.85, roughness: 0.3, flatShading: true });

  const train = new Group();
  const ring = new Mesh(new InternalGearGeometry(), steel);
  const pinion = new Mesh(new GearGeometry(), brass);
  ring.castShadow = ring.receiveShadow = true;
  pinion.castShadow = pinion.receiveShadow = true;
  train.add(ring, pinion);
  scene.add(train);

  let phaseRing = 0;
  let phasePinion = 0;
  let spin = 0;
  /** Tooth count actually cut, after the minimum-difference clamp — what the ratio is really running on. */
  let meshedPinionTeeth = 0;

  const rebuild = () => {
    ring.geometry.dispose();
    pinion.geometry.dispose();

    // An internal pair needs a minimum tooth-count difference or the tips foul — a real constraint, not a
    // limitation of this example.
    const pinionTeeth = Math.min(params.pinionTeeth, params.ringTeeth - MIN_DIFFERENCE);
    meshedPinionTeeth = pinionTeeth;

    // ---- the whole calculation ----
    // Same law as an external pair: equal MODULE, m = 2 * pitchRadius / teeth.
    const ringRadius = (params.module * params.ringTeeth) / 2;
    const pinionRadius = (params.module * pinionTeeth) / 2;
    // FIRST SIGN FLIP. The ring's teeth face inward, so the pinion sits inside it and the shafts are the
    // DIFFERENCE apart, not the sum. Equal tooth counts would put them concentric — no pair at all.
    const centeredistance = ringRadius - pinionRadius;

    // The ring's teeth grow inward from its pitch circle, so its tip radius is the SMALLER of the two and its
    // valley the larger — the mirror of the pinion, which is what meshing inward means.
    ring.geometry = new InternalGearGeometry({
      teeth: params.ringTeeth,
      tipRadius: ringRadius - ADDENDUM * params.module,
      valleyRadius: ringRadius + DEDENDUM * params.module,
      rimRadius: ringRadius + DEDENDUM * params.module + RIM_THICKNESS,
      rimSides: 64,
      tipWidth: TOOTH.tipWidth - BACKLASH,
      valleyWidth: TOOTH.valleyWidth,
      depth: TOOTH.depth,
    });

    pinion.geometry = new GearGeometry({
      teeth: pinionTeeth,
      outerRadius: pinionRadius + ADDENDUM * params.module,
      innerRadius: pinionRadius - DEDENDUM * params.module,
      tipWidth: TOOTH.tipWidth,
      valleyWidth: TOOTH.valleyWidth,
      holeRadius: pinionRadius * 0.3,
      holeSides: 24,
      depth: TOOTH.depth,
    });

    // Contact happens at +X, where the pinion's pitch circle touches the ring's from the inside.
    pinion.position.set(centeredistance, 0, 0);

    // ---- phasing ----
    // Unchanged from an external pair, which is the surprise: the pinion presents a TOOTH toward +X and the
    // ring a VALLEY there. Unroll the ring into a rack and it is obvious — the pinion drops into the space
    // between two of its teeth exactly as it would on a straight bar.
    const stepRing = (Math.PI * 2) / params.ringTeeth;
    phasePinion = -Math.PI / 2;
    // A valley sits half a period past a tooth, so back the ring off by that half step.
    phaseRing = -Math.PI / 2 - stepRing / 2;

    pinion.rotation.z = phasePinion;
    ring.rotation.z = phaseRing;
    spin = 0;

    stats.ringRadius = ringRadius.toFixed(4);
    stats.pinionRadius = pinionRadius.toFixed(4);
    stats.centeredistance = centeredistance.toFixed(4);
    stats.ratio = `${(params.ringTeeth / pinionTeeth).toFixed(3)} : 1`;

    frameObject(handle, train, { dolly: false });
  };

  rebuild();
  frameObject(handle, train, { fit: 1.15 });

  const stop = onFrame((delta) => {
    if (!params.animate) return;
    spin += delta * params.speed;
    // Teeth pass the contact point at the same rate, exactly as externally — but with no reversal, because
    // the pinion rolls along the INSIDE of the ring. Same sign on both, and that is the whole of it.
    ring.rotation.z = phaseRing + spin;
    pinion.rotation.z = phasePinion + (spin * params.ringTeeth) / meshedPinionTeeth;
  });

  const gui = new GUI();
  gui.title("Internal Gear Pair");

  const mesh = gui.addFolder("Mesh");
  mesh.add(params, "module", 0.04, 0.15, 0.005).name("Module (tooth size)").onChange(rebuild);
  mesh.add(params, "ringTeeth", 26, 60, 1).name("Ring Teeth").onChange(rebuild);
  // Clamped to at least MIN_DIFFERENCE below the ring — push it up and it stops rather than binding.
  mesh.add(params, "pinionTeeth", 12, 40, 1).name("Pinion Teeth").onChange(rebuild);
  mesh.open();

  const motion = gui.addFolder("Motion");
  motion.add(params, "animate").name("Run");
  motion.add(params, "speed", 0.1, 3, 0.05).name("Speed");
  motion.open();

  const material = gui.addFolder("Material");
  material.addColor(colors, "ring").name("Ring").onChange(() => steel.color.set(colors.ring));
  material.addColor(colors, "pinion").name("Pinion").onChange(() => brass.color.set(colors.pinion));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "ringRadius").name("Ring Pitch Radius").listen().disable();
  readout.add(stats, "pinionRadius").name("Pinion Pitch Radius").listen().disable();
  // The DIFFERENCE — drive the counts together and watch it collapse toward zero.
  readout.add(stats, "centeredistance").name("Center Distance").listen().disable();
  readout.add(stats, "ratio").name("Pinion turns per ring turn").listen().disable();
  readout.open();

  return () => {
    stop();
    gui.destroy();
    ring.geometry.dispose();
    pinion.geometry.dispose();
    steel.dispose();
    brass.dispose();
    dispose();
  };
}
