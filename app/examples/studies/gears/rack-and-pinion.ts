import GUI from "lil-gui";
import { Color, Group, Mesh, MeshStandardMaterial } from "three";
import { GearGeometry, RackGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Rack and Pinion",
  description:
    "STUDY — sizing a pinion to a rack that already exists. A rack's PITCH is an output: length divided by " +
    "teeth. A gear's pitch is its circumference divided by teeth. Two parts mesh when those two numbers are " +
    "equal, so setting them equal and solving for the radius is the entire calculation — and it is three " +
    "lines, inlined below. Everything else follows: the pinion rides on the rack's PITCH LINE, midway " +
    "between its two heights, with the teeth straddling it by half the tooth depth each way. Change Rack " +
    "Length or Rack Teeth and the pitch moves, so the pinion RESIZES to stay in mesh — it is never dialled " +
    "directly. Note what is NOT adjustable: the tooth profile is one shared constant, because two parts cut " +
    "to different teeth cannot mesh at any radius.",
};

/**
 * One tooth, shared by both parts. Deliberately not a dial — meshing requires the rack and the pinion to be
 * cut to the same tooth, so the study is about sizing the pinion, not reshaping the tooth.
 */
const TOOTH = {
  tipHeight: 0.38,
  valleyHeight: 0.2,
  tipWidth: 0.25,
  valleyWidth: 0.25,
  depth: 0.25,
};

/**
 * Root clearance — each part's valleys are cut this much clear of the other's tips, so a tooth never bottoms
 * out in the space it drops into. Real gearing does the same; the pitch circles roll, the tips do not touch.
 */
const CLEARANCE = 0.015;

/**
 * Backlash, as a fraction of one tooth period. At the pitch line a tooth and the space beside it are exactly
 * the same width, so with nothing removed the flanks bind on both sides at once. Thinning the pinion's tip
 * gives them somewhere to go — which is why real gears are cut slightly thin rather than to nominal size.
 */
const BACKLASH = 0.03;

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [0.5, 1.5, 3.4] });
  const { scene, onFrame, dispose } = handle;

  const params = { length: 3, rackTeeth: 12, pinionTeeth: 9, animate: true, speed: 0.6 };
  const colors = { steel: "#8f97a1", brass: "#b08d4f" };
  const stats = { rackPitch: "", pitchRadius: "", pinionPitch: "", outerRadius: "" };

  const steel = new MeshStandardMaterial({
    color: new Color(colors.steel),
    metalness: 0.8,
    roughness: 0.35,
    flatShading: true,
  });
  const brass = new MeshStandardMaterial({
    color: new Color(colors.brass),
    metalness: 0.85,
    roughness: 0.3,
    flatShading: true,
  });

  const assembly = new Group();
  const rack = new Mesh(new RackGeometry({ ...TOOTH, length: params.length, teeth: params.rackTeeth }), steel);
  const pinion = new Mesh(new GearGeometry(), brass);
  rack.castShadow = rack.receiveShadow = true;
  pinion.castShadow = pinion.receiveShadow = true;
  assembly.add(rack, pinion);
  scene.add(assembly);

  // Everything the mesh depends on, recomputed together. `contactX` and `phase` are captured here because the
  // frame loop rolls FROM them.
  let pitchRadius = 0;
  let contactX = 0;
  let phase = 0;
  let sweep = 0;
  let travel = 0;

  const rebuild = () => {
    rack.geometry.dispose();
    pinion.geometry.dispose();

    rack.geometry = new RackGeometry({ ...TOOTH, length: params.length, teeth: params.rackTeeth });
    const pitch = (rack.geometry as RackGeometry).pitch;

    // ---- the whole calculation ----
    // rack:   pitch = length / teeth                    (linear, along the bar)
    // pinion: pitch = 2 * PI * pitchRadius / teeth      (circumferential, around the wheel)
    // They mesh when those are equal, so solve the second for the radius:
    pitchRadius = (pitch * params.pinionTeeth) / (Math.PI * 2);

    // The pitch circle rolls on the rack's pitch LINE — midway between its two heights, where a tooth and the
    // space beside it are the same width. The pinion's teeth straddle that circle exactly as the rack's
    // straddle the line, so its two radii are the pitch radius plus and minus half the tooth depth.
    const pitchLine = (TOOTH.tipHeight + TOOTH.valleyHeight) / 2;
    const toothDepth = TOOTH.tipHeight - TOOTH.valleyHeight;
    const outerRadius = pitchRadius + toothDepth / 2 - CLEARANCE;

    pinion.geometry = new GearGeometry({
      teeth: params.pinionTeeth,
      outerRadius,
      innerRadius: pitchRadius - toothDepth / 2 - CLEARANCE,
      tipWidth: TOOTH.tipWidth - BACKLASH,
      valleyWidth: TOOTH.valleyWidth,
      holeRadius: pitchRadius * 0.28,
      holeSides: 24,
      depth: TOOTH.depth,
    });

    // A pinion tooth has to land in a rack VALLEY, and the rack's valleys are centered at whole multiples of
    // the pitch from its left end. Park the wheel over the one nearest the middle.
    contactX = Math.round(params.length / 2 / pitch) * pitch;
    // Then turn it until a tooth points straight down. `GearShape` rests with a tooth UP, so the offset is
    // half a turn — folded back into a single tooth period, since every tooth is equivalent.
    phase = Math.PI % ((Math.PI * 2) / params.pinionTeeth);

    // Both parts are centered on the same Z plane: the rack extrudes forward from 0, the gear straddles its
    // own thickness.
    pinion.position.set(contactX, pitchLine + pitchRadius, TOOTH.depth / 2);
    pinion.rotation.z = phase;

    // How far the wheel may roll before it overhangs an end.
    sweep = Math.max(params.length - outerRadius * 2, 1e-3);
    travel = 0;

    // The rack's origin is its left end, so centring the pair is arithmetic on the rack's own anchor.
    assembly.position.x = -params.length / 2;

    stats.rackPitch = pitch.toFixed(4);
    stats.pitchRadius = pitchRadius.toFixed(4);
    // The same number as Rack Pitch, arrived at from the wheel's side — that equality IS the mesh.
    stats.pinionPitch = ((Math.PI * 2 * pitchRadius) / params.pinionTeeth).toFixed(4);
    stats.outerRadius = outerRadius.toFixed(4);

    frameObject(handle, assembly, { dolly: false });
  };

  rebuild();
  frameObject(handle, assembly, { fit: 1.25 });

  const stop = onFrame((delta) => {
    if (!params.animate) return;
    travel += delta * params.speed;

    // Triangle wave: roll to one end, then back.
    const t = travel % (sweep * 2);
    const offset = (t < sweep ? t : sweep * 2 - t) - sweep / 2;

    // Rolling without slipping — turn by the arc that the travel covers. Get this relationship right and the
    // teeth stay in mesh for free, at any radius, forever.
    pinion.position.x = contactX + offset;
    pinion.rotation.z = phase - offset / pitchRadius;
  });

  const gui = new GUI();
  gui.title("Rack and Pinion");

  const fit = gui.addFolder("Fit");
  fit.add(params, "length", 1.5, 8, 0.05).name("Rack Length").onChange(rebuild);
  fit.add(params, "rackTeeth", 4, 40, 1).name("Rack Teeth").onChange(rebuild);
  // The only dial that touches the pinion. Its radius is never set — it is solved for.
  fit.add(params, "pinionTeeth", 5, 30, 1).name("Pinion Teeth").onChange(rebuild);
  fit.open();

  const motion = gui.addFolder("Motion");
  motion.add(params, "animate").name("Roll");
  motion.add(params, "speed", 0.1, 3, 0.05).name("Speed");
  motion.open();

  const material = gui.addFolder("Material");
  material.addColor(colors, "steel").name("Rack").onChange(() => steel.color.set(colors.steel));
  material.addColor(colors, "brass").name("Pinion").onChange(() => brass.color.set(colors.brass));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "rackPitch").name("Rack Pitch").listen().disable();
  readout.add(stats, "pinionPitch").name("Pinion Pitch").listen().disable();
  readout.add(stats, "pitchRadius").name("Pitch Radius").listen().disable();
  readout.add(stats, "outerRadius").name("Outer Radius").listen().disable();
  readout.open();

  return () => {
    stop();
    gui.destroy();
    rack.geometry.dispose();
    pinion.geometry.dispose();
    steel.dispose();
    brass.dispose();
    dispose();
  };
}
