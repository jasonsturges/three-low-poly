import GUI from "lil-gui";
import { Group, Mesh, MeshPhysicalMaterial } from "three";
import { ErlenmeyerFlaskGeometry, createLiquidFill, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Erlenmeyer Flask" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    bodyRadius: 1,
    neckRadius: 0.3,
    bodyHeight: 2.5,
    neckHeight: 1,
    radialSegments: 16,
    rim: 0.4,
    fill: 0.35,
    color: 0x4bbfa0,
    opacity: 0.85,
    glow: 0.6,
    gap: 0.04,
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
    const geometry = new ErlenmeyerFlaskGeometry({
      bodyRadius: params.bodyRadius,
      neckRadius: params.neckRadius,
      bodyHeight: params.bodyHeight,
      neckHeight: params.neckHeight,
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

    centerObject(group);
  };

  build();

  const gui = new GUI();
  gui.title("Erlenmeyer Flask");
  gui.add(params, "bodyRadius", 0.3, 2, 0.01).name("Body Radius").onChange(build);
  gui.add(params, "neckRadius", 0.1, 0.8, 0.01).name("Neck Radius").onChange(build);
  gui.add(params, "bodyHeight", 0.5, 4, 0.01).name("Body Height").onChange(build);
  gui.add(params, "neckHeight", 0.1, 3, 0.01).name("Neck Height").onChange(build);
  gui.add(params, "radialSegments", 3, 64, 1).name("Radial Segments").onChange(build);
  gui.add(params, "rim", 0, 0.8, 0.01).name("Rim").onChange(build);

  const liquid = gui.addFolder("Fill");
  liquid.add(params, "fill", 0, 1, 0.01).name("Fill").onChange(build);
  liquid.add(params, "gap", 0, 0.2, 0.005).name("Gap").onChange(build);
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
