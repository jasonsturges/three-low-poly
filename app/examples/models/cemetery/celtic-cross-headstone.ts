import GUI from "lil-gui";
import { CelticCrossHeadstone, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Celtic Cross Headstone" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 0.6, 3] });

  const params = {
    height: 1.3,
    span: 0.62,
    thickness: 0.12,
    crossing: 0.7,
    flare: 0.03,
    ring: true,
    ringWidth: 0.085,
    depth: 0.14,
  };

  const makeHeadstone = () =>
    new CelticCrossHeadstone({
      height: params.height,
      span: params.span,
      thickness: params.thickness,
      crossing: params.crossing,
      flare: params.flare,
      ring: params.ring,
      ringWidth: params.ringWidth,
      depth: params.depth,
    });

  let headstone = makeHeadstone();
  scene.add(headstone);
  centerObject(headstone);

  const rebuild = () => {
    scene.remove(headstone);
    headstone.geometry.dispose();
    headstone.material.dispose();
    headstone = makeHeadstone();
    scene.add(headstone);
    centerObject(headstone);
  };

  const gui = new GUI();
  gui.title("Celtic Cross");
  // Turn the ring off and it is a plain flared cross — the nimbus is the only thing it adds.
  gui.add(params, "ring").name("Nimbus Ring").onChange(rebuild);
  gui.add(params, "ringWidth", 0.03, 0.2, 0.005).name("Ring Band").onChange(rebuild);
  gui.add(params, "flare", 0, 0.12, 0.005).name("Arm Flare").onChange(rebuild);

  const slab = gui.addFolder("Slab");
  slab.add(params, "height", 0.6, 2, 0.05).name("Height").onChange(rebuild);
  slab.add(params, "span", 0.3, 1.2, 0.02).name("Arm Span").onChange(rebuild);
  slab.add(params, "thickness", 0.05, 0.3, 0.01).name("Arm Thickness").onChange(rebuild);
  slab.add(params, "crossing", 0.5, 0.85, 0.01).name("Crossing Height").onChange(rebuild);
  slab.add(params, "depth", 0.05, 0.3, 0.01).name("Depth").onChange(rebuild);

  return () => {
    gui.destroy();
    headstone.geometry.dispose();
    headstone.material.dispose();
    dispose();
  };
}
