import GUI from "lil-gui";
import { Mesh } from "three";
import { FlorenceFlaskStand } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { gradientBackdrop } from "../../../framework/gradientBackdrop";

export const meta = { title: "Florence Flask Stand" };

export default function (container: HTMLElement) {
  const handle = createScene(container);
  const { scene, dispose } = handle;
  const disposeBackdrop = gradientBackdrop(scene);

  const params = {
    bodyRadius: 1,
    neckRadius: 0.2,
    neckHeight: 1.5,
    seat: 0.55,
    legs: 3,
    clearance: 0.15,
    fill: 0.4,
    color: 0x4bbfa0,
    glow: 0.6,
  };

  const build = () =>
    new FlorenceFlaskStand({
      flask: { bodyRadius: params.bodyRadius, neckRadius: params.neckRadius, neckHeight: params.neckHeight },
      seat: params.seat,
      legs: params.legs,
      clearance: params.clearance,
      fill:
        params.fill > 0
          ? { fill: params.fill, color: params.color, glow: params.glow, opacity: 0.88, inset: 0.06 }
          : undefined,
    });

  const disposeAssembly = (group: FlorenceFlaskStand) => {
    group.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  };

  let assembly = build();
  scene.add(assembly);
  frameObject(handle, assembly);

  const rebuild = () => {
    scene.remove(assembly);
    disposeAssembly(assembly);
    assembly = build();
    scene.add(assembly);
    frameObject(handle, assembly, { dolly: false });
  };

  const gui = new GUI();
  gui.title("Florence Flask Stand");

  // Resize the spherical base — the ring re-sizes to the bulb and the seating math re-runs.
  const flask = gui.addFolder("Flask");
  flask.add(params, "bodyRadius", 0.3, 2, 0.01).name("Body Radius").onChange(rebuild);
  flask.add(params, "neckRadius", 0.05, 0.6, 0.01).name("Neck Radius").onChange(rebuild);
  flask.add(params, "neckHeight", 0.2, 4, 0.01).name("Neck Height").onChange(rebuild);
  flask.open();

  const stand = gui.addFolder("Stand");
  stand.add(params, "seat", 0.2, 0.95, 0.01).name("Seat").onChange(rebuild);
  stand.add(params, "legs", 1, 8, 1).name("Legs").onChange(rebuild);
  stand.add(params, "clearance", 0, 0.6, 0.01).name("Clearance").onChange(rebuild);
  stand.open();

  const fill = gui.addFolder("Fill");
  fill.add(params, "fill", 0, 1, 0.01).name("Fill").onChange(rebuild);
  fill.addColor(params, "color").name("Color").onChange(rebuild);
  fill.add(params, "glow", 0, 2, 0.01).name("Glow").onChange(rebuild);
  fill.open();

  return () => {
    gui.destroy();
    scene.remove(assembly);
    disposeAssembly(assembly);
    disposeBackdrop();
    dispose();
  };
}
