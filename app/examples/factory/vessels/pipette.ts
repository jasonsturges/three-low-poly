import GUI from "lil-gui";
import { Group, Mesh, MeshPhysicalMaterial } from "three";
import { PipetteGeometry, createLiquidFill } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { gradientBackdrop } from "../../../framework/gradientBackdrop";

export const meta = { title: "Pipette" };

export default function (container: HTMLElement) {
  const handle = createScene(container);
  const { scene, dispose } = handle;
  const disposeBackdrop = gradientBackdrop(scene);
  let framed = false;

  const params = {
    radius: 0.1,
    height: 3,
    tipLength: 0.66,
    radialSegments: 16,
    rim: 0.4,
    fill: 0.45,
    color: 0xe08a3c,
    opacity: 0.85,
    glow: 0.5,
    gap: 0.06,
  };

  const glass = new MeshPhysicalMaterial({
    color: 0x9fdfff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.9,
    ior: 1.5,
  });

  const group = new Group();
  scene.add(group);

  const clear = () => {
    for (const child of group.children.slice()) {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        if (child.material !== glass) {
          (Array.isArray(child.material) ? child.material : [child.material]).forEach((m) => m.dispose());
        }
      }
    }
    group.clear();
  };

  const build = () => {
    clear();
    const geometry = new PipetteGeometry({
      radius: params.radius,
      height: params.height,
      tipLength: params.tipLength,
      radialSegments: params.radialSegments,
      rim: params.rim,
    });
    const shell = new Mesh(geometry, glass);
    shell.renderOrder = 1;
    group.add(shell);

    const liquid = createLiquidFill(
      geometry.profile,
      { fill: params.fill, color: params.color, opacity: params.opacity, glow: params.glow, inset: params.gap },
      params.radialSegments,
    );
    if (liquid) group.add(liquid);

    // Frame once; follow (without re-fitting) on rebuilds so the viewer's zoom survives.
    frameObject(handle, group, { dolly: !framed });
    framed = true;
  };

  build();

  const gui = new GUI();
  gui.title("Pipette");
  gui.add(params, "radius", 0.04, 0.25, 0.01).name("Radius").onChange(build);
  gui.add(params, "height", 1, 5, 0.01).name("Height").onChange(build);
  gui.add(params, "tipLength", 0.1, 2, 0.01).name("Tip Length").onChange(build);
  gui.add(params, "radialSegments", 3, 48, 1).name("Radial Segments").onChange(build);
  gui.add(params, "rim", 0, 0.8, 0.01).name("Rim").onChange(build);

  const liquid = gui.addFolder("Fill");
  liquid.add(params, "fill", 0, 1, 0.01).name("Fill").onChange(build);
  liquid.add(params, "gap", 0, 0.25, 0.005).name("Gap").onChange(build);
  liquid.addColor(params, "color").name("Color").onChange(build);
  liquid.add(params, "opacity", 0, 1, 0.01).name("Opacity").onChange(build);
  liquid.add(params, "glow", 0, 2, 0.01).name("Glow").onChange(build);
  liquid.open();

  return () => {
    gui.destroy();
    clear();
    glass.dispose();
    disposeBackdrop();
    dispose();
  };
}
