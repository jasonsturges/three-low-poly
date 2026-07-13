import GUI from "lil-gui";
import { Group, Mesh } from "three";
import { centerObject, createWroughtIronFence, StoneFencePost } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wrought Iron Fence" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0xe64d4d });

  const params = {
    count: 12,
    gap: 0.3,
    height: 2.0,
    radius: 0.05,
    radialSegments: 8,
    finialHeight: 0.3,
    finialRadius: 0.075,
    finialScaleZ: 1.0,
    railHeight: 0.1,
    railThickness: 0.05,
    lowerRailY: 0.05,
    railEmbed: 0.05,
  };

  let assembly = new Group();
  scene.add(assembly);

  const disposeAssembly = () => {
    for (const part of assembly.children) {
      (part as Mesh).geometry.dispose();
    }
  };

  const rebuild = () => {
    disposeAssembly();
    scene.remove(assembly);
    assembly = new Group();

    const post = new StoneFencePost();
    const upperRailY = params.height - params.railHeight / 2;

    // Ask the post how wide it is rather than hardcoding it. Pickets must CLEAR the post's widest
    // step over their whole height, or they bury themselves in the stonework. The rails must then
    // REACH back past that step to embed in the narrower column, or they float unattached.
    const clearWidth = post.geometry.maxWidthBetween(0, params.height);
    const railReach = post.geometry.widthAt(upperRailY);

    const fence = createWroughtIronFence({
      ...params,
      upperRailY,
      railOverhang: (clearWidth - railReach) / 2 + params.railEmbed,
    });

    // The run fills the clear opening between the post faces, so it starts one half-post in.
    fence.position.x = clearWidth / 2;
    fence.castShadow = true;
    assembly.add(fence);

    // A post at each end of the run.
    const runEnd = clearWidth + fence.userData.span.length;
    for (const x of [0, runEnd]) {
      const end = post.clone();
      end.position.x = x;
      end.castShadow = true;
      assembly.add(end);
    }

    scene.add(assembly);
    centerObject(assembly);
  };

  rebuild();

  const gui = new GUI();
  gui.add(params, "count", 1, 30, 1).name("Pickets").onChange(rebuild);
  gui.add(params, "gap", 0.05, 1, 0.01).name("Gap").onChange(rebuild);
  gui.add(params, "height", 0.5, 3, 0.01).name("Picket Height").onChange(rebuild);
  gui.add(params, "radius", 0.01, 0.3, 0.005).name("Picket Radius").onChange(rebuild);
  gui.add(params, "radialSegments", 3, 24, 1).name("Radial Segments").onChange(rebuild);
  gui.add(params, "finialHeight", 0.01, 0.5, 0.005).name("Finial Height").onChange(rebuild);
  gui.add(params, "finialRadius", 0.01, 0.3, 0.005).name("Finial Radius").onChange(rebuild);
  gui.add(params, "finialScaleZ", 0.1, 1, 0.01).name("Finial Scale Z").onChange(rebuild);
  gui.add(params, "railHeight", 0.01, 0.5, 0.01).name("Rail Height").onChange(rebuild);
  gui.add(params, "railThickness", 0.01, 0.5, 0.01).name("Rail Thickness").onChange(rebuild);
  gui.add(params, "lowerRailY", 0.0, 2.5, 0.01).name("Lower Rail Y").onChange(rebuild);
  gui.add(params, "railEmbed", 0.0, 0.3, 0.01).name("Rail Embed").onChange(rebuild);

  return () => {
    gui.destroy();
    disposeAssembly();
    dispose();
  };
}
