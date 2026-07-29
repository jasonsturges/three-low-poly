import GUI from "lil-gui";
import { Color, Group, Mesh, MeshStandardMaterial } from "three";
import { GearGeometry } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";

export const meta = {
  title: "Spur Gear Pair",
  description:
    "STUDY — two spur gears in mesh, and the one quantity they must share. A gear's tooth size is its MODULE: " +
    "pitch diameter divided by tooth count, or equivalently `2 × pitchRadius / teeth`. Two gears mesh when " +
    "their modules are equal and for no other reason — so the module is the input here, and each wheel's " +
    "RADIUS is solved from it. Set the two tooth counts and the sizes follow; the centre distance is the sum " +
    "of the two pitch radii, and the ratio is the tooth counts, not the radii. Drive a 30-tooth against an " +
    "8-tooth and the small one spins nearly four times per turn of the large — that is the whole of gearing. " +
    "The phase is the other half: the driver carries a TOOTH toward the line of centres and the driven a " +
    "VALLEY, or they collide instead of meshing. NOTE THE TOOTH FORM: these are straight-flanked trapezoids, " +
    "not involutes, so they mesh convincingly across a range and bind outside it — which is why tooth counts " +
    "start at 12 here. Real gearing uses the involute curve precisely to remove that limit.",
};

/**
 * Standard tooth proportions, both **multiples of the module** — which is the point: nothing about a tooth is
 * an independent number. `ADDENDUM` is how far the tip stands above the pitch circle and `DEDENDUM` how far
 * the valley falls below it. The extra `0.25` is root clearance, so a tip never bottoms out in the valley it
 * drops into.
 *
 * Getting this wrong is instructive. Fixing the depth at a constant instead makes a fine-module gear four
 * tooth-heights deep, and no phase will mesh it.
 */
const ADDENDUM = 1;
const DEDENDUM = 1.25;
/** Backlash as a fraction of one period — at the pitch circle a tooth and its space are the same width. */
const BACKLASH = 0.06;

const TOOTH = { tipWidth: 0.25, valleyWidth: 0.25, depth: 0.22 };

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x0a0b10, cameraPosition: [0, 0.6, 3.6] });
  const { scene, onFrame, dispose } = handle;

  const params = { module: 0.09, teethA: 22, teethB: 11, animate: true, speed: 0.5 };
  const colors = { driver: "#b08d4f", driven: "#8f97a1" };
  const stats = { radiusA: "", radiusB: "", centreDistance: "", ratio: "" };

  const brass = new MeshStandardMaterial({ color: new Color(colors.driver), metalness: 0.85, roughness: 0.3, flatShading: true });
  const steel = new MeshStandardMaterial({ color: new Color(colors.driven), metalness: 0.8, roughness: 0.35, flatShading: true });

  const train = new Group();
  const gearA = new Mesh(new GearGeometry(), brass);
  const gearB = new Mesh(new GearGeometry(), steel);
  gearA.castShadow = gearA.receiveShadow = true;
  gearB.castShadow = gearB.receiveShadow = true;
  train.add(gearA, gearB);
  scene.add(train);

  let phaseA = 0;
  let phaseB = 0;
  let spin = 0;

  /** A wheel cut to the shared tooth, straddling its own pitch circle. */
  const cut = (teeth: number, pitchRadius: number, module: number, thin: boolean) =>
    new GearGeometry({
      teeth,
      outerRadius: pitchRadius + ADDENDUM * module,
      innerRadius: pitchRadius - DEDENDUM * module,
      tipWidth: TOOTH.tipWidth - (thin ? BACKLASH : 0),
      valleyWidth: TOOTH.valleyWidth,
      holeRadius: pitchRadius * 0.3,
      holeSides: 24,
      depth: TOOTH.depth,
    });

  const rebuild = () => {
    gearA.geometry.dispose();
    gearB.geometry.dispose();

    // ---- the whole calculation ----
    // MODULE is tooth size: m = 2 * pitchRadius / teeth. Two gears mesh when their modules match, so fix m
    // and each radius is solved rather than chosen.
    const radiusA = (params.module * params.teethA) / 2;
    const radiusB = (params.module * params.teethB) / 2;
    // Their pitch circles roll on each other, so the shafts sit exactly that far apart.
    const centreDistance = radiusA + radiusB;

    gearA.geometry = cut(params.teethA, radiusA, params.module, false);
    gearB.geometry = cut(params.teethB, radiusB, params.module, true);

    gearA.position.set(0, 0, 0);
    gearB.position.set(centreDistance, 0, 0);

    // ---- phasing ----
    // On the line of centres, A must present a TOOTH and B a VALLEY, or they collide instead of meshing.
    // `GearShape` rests with a tooth at +Y, so a quarter turn back puts one at +X, facing B.
    const stepB = (Math.PI * 2) / params.teethB;
    phaseA = -Math.PI / 2;
    // B presents the opposite side, at -X. A valley sits exactly half a period past a tooth — whatever the
    // two flat widths, since the flanks absorb the difference symmetrically — so back off that half step.
    phaseB = Math.PI / 2 - stepB / 2;

    gearA.rotation.z = phaseA;
    gearB.rotation.z = phaseB;
    spin = 0;

    train.position.x = -centreDistance / 2;

    stats.radiusA = radiusA.toFixed(4);
    stats.radiusB = radiusB.toFixed(4);
    stats.centreDistance = centreDistance.toFixed(4);
    stats.ratio = `${(params.teethB / params.teethA).toFixed(3)} : 1`;

    frameObject(handle, train, { dolly: false });
  };

  rebuild();
  frameObject(handle, train, { fit: 1.2 });

  const stop = onFrame((delta) => {
    if (!params.animate) return;
    spin += delta * params.speed;
    // Mating teeth pass the contact point at the same rate, so turns are in inverse proportion to tooth
    // count — and the mesh holds forever without tracking anything but this one ratio. External gears
    // counter-rotate, which is the minus sign.
    gearA.rotation.z = phaseA + spin;
    gearB.rotation.z = phaseB - (spin * params.teethA) / params.teethB;
  });

  const gui = new GUI();
  gui.title("Spur Gear Pair");

  const mesh = gui.addFolder("Mesh");
  // The shared quantity. Change it and BOTH wheels resize together, staying in mesh.
  mesh.add(params, "module", 0.04, 0.2, 0.005).name("Module (tooth size)").onChange(rebuild);
  // Floored at 12. Below that these straight flanks foul each other — see the note on the tooth form.
  mesh.add(params, "teethA", 12, 40, 1).name("Driver Teeth").onChange(rebuild);
  mesh.add(params, "teethB", 12, 40, 1).name("Driven Teeth").onChange(rebuild);
  mesh.open();

  const motion = gui.addFolder("Motion");
  motion.add(params, "animate").name("Run");
  motion.add(params, "speed", 0.1, 3, 0.05).name("Speed");
  motion.open();

  const material = gui.addFolder("Material");
  material.addColor(colors, "driver").name("Driver").onChange(() => brass.color.set(colors.driver));
  material.addColor(colors, "driven").name("Driven").onChange(() => steel.color.set(colors.driven));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "radiusA").name("Pitch Radius A").listen().disable();
  readout.add(stats, "radiusB").name("Pitch Radius B").listen().disable();
  readout.add(stats, "centreDistance").name("Centre Distance").listen().disable();
  // Tooth counts, never radii — a 22:11 pair turns 2:1 at any module.
  readout.add(stats, "ratio").name("Ratio (driven turns)").listen().disable();
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
