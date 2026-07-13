import GUI from "lil-gui";
import { Arch, centerObject } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";

export const meta = { title: "Arch" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createOrthographicScene(container, { frustumSize: 5 });

  const params = {
    span: 4,
    legHeight: 2,
    profile: "bar" as "bar" | "tube",
    thickness: 0.4,
    depth: 0.5,
    tubeRadius: 0.08,
    tubeSides: 8,
    segments: 24,
    legSegments: 2,
    color: "#9a9186",
  };

  const makeArch = () => {
    const mesh = new Arch(params);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);
    centerObject(mesh);
    return mesh;
  };

  let arch = makeArch();

  const rebuild = () => {
    arch.geometry.dispose();
    arch.material.dispose();
    scene.remove(arch);

    arch = makeArch();
  };

  const gui = new GUI();
  gui.title("Arch");

  // The path does not care what it is carrying. A rectangle gives a masonry band; a circle gives
  // wrought iron tubing arching over a gate. Same arc, same frames, same flat base caps.
  gui.add(params, "profile", ["bar", "tube"]).name("Cross-Section").onChange(rebuild);

  gui.add(params, "span", 1, 8, 0.1).name("Span").onChange(rebuild);
  // Drop to 0 for a pure semicircle. It still sits flat, because the arc supplies a vertical tangent
  // at its springing — the base cap is perpendicular to it.
  gui.add(params, "legHeight", 0, 5, 0.1).name("Leg Height").onChange(rebuild);
  // 3 gives a chiselled, faceted arch. 48 is smooth. The low-poly knob, on a curve.
  gui.add(params, "segments", 2, 64, 1).name("Arc Segments").onChange(rebuild);

  const bar = gui.addFolder("Bar");
  bar.add(params, "thickness", 0.05, 1.5, 0.05).name("Band Thickness").onChange(rebuild);
  bar.add(params, "depth", 0.05, 1.5, 0.05).name("Wall Depth").onChange(rebuild);

  const tube = gui.addFolder("Tube");
  tube.add(params, "tubeRadius", 0.02, 0.4, 0.01).name("Radius").onChange(rebuild);
  // 4 gives square tubing — what real wrought iron is.
  tube.add(params, "tubeSides", 3, 24, 1).name("Sides").onChange(rebuild);

  gui.addColor(params, "color").name("Color").onChange(rebuild);

  return () => {
    gui.destroy();
    arch.geometry.dispose();
    arch.material.dispose();
    dispose();
  };
}
