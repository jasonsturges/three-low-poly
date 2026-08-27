import GUI from "lil-gui";
import { DoubleSide, Group, Mesh, MeshPhysicalMaterial } from "three";
import { BeakerGeometry, createLiquidFill, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Beaker" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    radius: 0.8,
    height: 1.6,
    spout: 0.3,
    spoutWidth: 0.5,
    radialSegments: 48,
    fill: 0.5,
    color: 0x4bbfa0,
    opacity: 0.85,
    glow: 0.5,
    gap: 0.05,
  };

  // DoubleSide here: the beaker is a single-surface open cylinder (no double wall), so the far inner wall
  // needs to render. A prototype to judge the spout — we can refine the wall treatment after.
  const glass = new MeshPhysicalMaterial({
    color: 0x9fdfff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.9,
    ior: 1.5,
    side: DoubleSide,
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
    const geometry = new BeakerGeometry({
      radius: params.radius,
      height: params.height,
      spout: params.spout,
      spoutWidth: params.spoutWidth,
      radialSegments: params.radialSegments,
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

    centerObject(group);
  };

  build();

  const gui = new GUI();
  gui.title("Beaker");
  gui.add(params, "radius", 0.3, 1.5, 0.01).name("Radius").onChange(build);
  gui.add(params, "height", 0.5, 3, 0.01).name("Height").onChange(build);
  gui.add(params, "spout", 0, 0.8, 0.01).name("Spout").onChange(build);
  gui.add(params, "spoutWidth", 0.1, 1.2, 0.01).name("Spout Width").onChange(build);
  gui.add(params, "radialSegments", 8, 96, 1).name("Radial Segments").onChange(build);

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
    dispose();
  };
}
