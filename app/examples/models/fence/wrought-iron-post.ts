import GUI from "lil-gui";
import { centerObject, WroughtIronPost, WroughtIronPostGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wrought Iron Post" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0xe64d4d });

  const params = {
    height: 1.1,
    radius: 0.06,
    ballRadius: 0.1,
    ballOffset: 0.06,
    radialSegments: 6,
    ballWidthSegments: 8,
    ballHeightSegments: 6,
  };

  const post = new WroughtIronPost(params);
  scene.add(post);
  centerObject(post);

  const rebuild = () => {
    post.geometry.dispose();
    post.geometry = new WroughtIronPostGeometry(params);
    centerObject(post);
  };

  const gui = new GUI();
  gui.add(params, "height", 0.3, 3, 0.05).name("Shaft Height").onChange(rebuild);
  gui.add(params, "radius", 0.02, 0.2, 0.005).name("Radius").onChange(rebuild);
  gui.add(params, "ballRadius", 0.02, 0.3, 0.005).name("Ball Radius").onChange(rebuild);
  gui.add(params, "ballOffset", -0.1, 0.3, 0.005).name("Ball Offset").onChange(rebuild);
  gui.add(params, "radialSegments", 3, 24, 1).name("Radial Segments").onChange(rebuild);
  gui.add(params, "ballWidthSegments", 3, 24, 1).name("Ball Width Segs").onChange(rebuild);
  gui.add(params, "ballHeightSegments", 2, 24, 1).name("Ball Height Segs").onChange(rebuild);

  return () => {
    gui.destroy();
    post.geometry.dispose();
    post.material.dispose();
    dispose();
  };
}
