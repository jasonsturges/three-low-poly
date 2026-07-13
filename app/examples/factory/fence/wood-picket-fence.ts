import GUI from "lil-gui";
import { Group, Mesh } from "three";
import { centerObject, createWoodPicketFence, WoodPost } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wood Picket Fence" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x6ea8d8 });

  const params = {
    count: 10,
    width: 0.35,
    gap: 0.18,
    height: 1.2,
    thickness: 0.04,
    pointHeight: 0.18,
    railHeight: 0.12,
    railThickness: 0.04,
    lowerRailY: 0.25,
    upperRailY: 0.95,
    railEmbed: 0.02,
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

    // The post stands a little proud of the pickets, cap and all.
    const post = new WoodPost({ height: params.height + params.pointHeight });

    // Pickets clear the post's widest point; the stringers reach back in to meet the shaft.
    const clearWidth = post.geometry.maxWidthBetween(0, params.height);
    const railReach = post.geometry.widthAt(params.upperRailY);

    const fence = createWoodPicketFence({
      ...params,
      railOverhang: (clearWidth - railReach) / 2 + params.railEmbed,
    });

    fence.position.x = clearWidth / 2;
    fence.castShadow = true;
    assembly.add(fence);

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
  gui.add(params, "width", 0.1, 0.8, 0.01).name("Plank Width").onChange(rebuild);
  gui.add(params, "gap", 0.02, 0.6, 0.01).name("Gap").onChange(rebuild);
  gui.add(params, "height", 0.4, 2.5, 0.05).name("Height").onChange(rebuild);
  gui.add(params, "thickness", 0.01, 0.15, 0.005).name("Thickness").onChange(rebuild);
  gui.add(params, "pointHeight", 0, 0.5, 0.01).name("Point Height").onChange(rebuild);
  gui.add(params, "railHeight", 0.04, 0.3, 0.01).name("Stringer Height").onChange(rebuild);
  gui.add(params, "railThickness", 0.01, 0.15, 0.005).name("Stringer Thickness").onChange(rebuild);
  gui.add(params, "lowerRailY", 0.05, 2, 0.01).name("Lower Stringer Y").onChange(rebuild);
  gui.add(params, "upperRailY", 0.05, 2, 0.01).name("Upper Stringer Y").onChange(rebuild);
  gui.add(params, "railEmbed", 0.0, 0.2, 0.01).name("Stringer Embed").onChange(rebuild);

  return () => {
    gui.destroy();
    disposeAssembly();
    dispose();
  };
}
